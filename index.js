const express = require('express')
const path = require('path')
const { Low, JSONFile } = require('lowdb')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const file = path.join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-please'

async function initDB(){
  await db.read()
  db.data = db.data || { projects: [], leads: [], users: [] }
  // seed sample projects if empty
  if (!db.data.projects || db.data.projects.length === 0){
    db.data.projects = [
      { id: 1, title: 'Green Heights', location: 'Sector A', status: 'Available' },
      { id: 2, title: 'Maple Residency', location: 'Sector B', status: 'Sold Out' }
    ]
  }
  // seed default admin user if no users
  if (!db.data.users || db.data.users.length === 0){
    const passwordHash = bcrypt.hashSync('admin123', 10)
    db.data.users = [ { id: 1, username: 'admin', passwordHash } ]
    console.log('Seeded default admin: username=admin password=admin123')
  }
  await db.write()
}
initDB()

function requireAuth(req,res,next){
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = auth.slice(7)
  try{
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  }catch(err){
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.get('/api/projects', async (req,res)=>{
  await db.read()
  res.json(db.data.projects || [])
})

app.post('/api/leads', async (req,res)=>{
  const lead = { id: Date.now(), ...req.body }
  await db.read()
  db.data.leads.push(lead)
  await db.write()
  res.status(201).json({ success: true })
})

// Auth: login
app.post('/api/login', async (req,res)=>{
  const { username, password } = req.body || {}
  await db.read()
  const user = (db.data.users || []).find(u=>u.username === username)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = bcrypt.compareSync(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
})

// Create a new project (protected)
app.post('/api/projects', requireAuth, async (req,res)=>{
  const project = { id: Date.now(), ...req.body }
  await db.read()
  db.data.projects.push(project)
  await db.write()
  res.status(201).json(project)
})

// Update an existing project (protected)
app.put('/api/projects/:id', requireAuth, async (req,res)=>{
  const id = Number(req.params.id)
  await db.read()
  const idx = (db.data.projects || []).findIndex(p=>p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  db.data.projects[idx] = { ...db.data.projects[idx], ...req.body }
  await db.write()
  res.json(db.data.projects[idx])
})

// Delete a project (protected)
app.delete('/api/projects/:id', requireAuth, async (req,res)=>{
  const id = Number(req.params.id)
  await db.read()
  const before = db.data.projects.length
  db.data.projects = (db.data.projects || []).filter(p=>p.id !== id)
  await db.write()
  res.json({ deleted: before - db.data.projects.length })
})

const multer = require('multer')
const fs = require('fs')

// ensure uploads dir
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const sharp = require('sharp')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1E9)
    const ext = path.extname(file.originalname)
    cb(null, unique + ext)
  }
})

function fileFilter (req, file, cb) {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'), false)
  cb(null, true)
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB limit

// serve uploaded files
app.use('/uploads', express.static(uploadsDir))

// upload an image for a project (protected)
app.post('/api/projects/:id/images', requireAuth, upload.single('image'), async (req,res)=>{
  const id = Number(req.params.id)
  if (!req.file) return res.status(400).json({ error: 'No file' })
  await db.read()
  const project = (db.data.projects || []).find(p=>p.id === id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  // server-side resize/optimize using sharp (overwrite uploaded file)
  try{
    const filePath = path.join(uploadsDir, req.file.filename)
    await sharp(filePath).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(filePath + '.tmp')
    fs.renameSync(filePath + '.tmp', filePath)
  }catch(err){
    console.warn('Image processing failed:', err && err.message)
  }

  project.images = project.images || []
  const url = '/uploads/' + req.file.filename
  // store as object for metadata and soft-delete support
  project.images.push({ url, filename: req.file.filename, deleted: false, createdAt: new Date().toISOString() })
  await db.write()
  res.json({ url })
})

// Delete an image from a project (protected)
app.delete('/api/projects/:id/images', requireAuth, async (req,res)=>{
  const id = Number(req.params.id)
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url' })
  await db.read()
  const project = (db.data.projects || []).find(p=>p.id === id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  project.images = project.images || []
  // find image object by url or filename
  const idx = project.images.findIndex(img => (typeof img === 'string' ? img === url : img.url === url || img.filename === path.basename(url)))
  if (idx === -1) return res.status(404).json({ error: 'Image not found on project' })
  const imgObj = project.images[idx]
  // soft-delete: mark deleted and move file to trash
  imgObj.deleted = true
  imgObj.deletedAt = new Date().toISOString()
  const filename = imgObj.filename || path.basename(url)
  const src = path.join(uploadsDir, filename)
  const trashDir = path.join(uploadsDir, 'trash')
  if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true })
  const dest = path.join(trashDir, filename)
  try{
    if (fs.existsSync(src)) fs.renameSync(src, dest)
    imgObj.trashFilename = path.join('trash', filename)
  }catch(err){
    console.warn('Failed to move file to trash:', err && err.message)
  }
  await db.write()
  res.json({ deleted: true })
})

// Undo soft-delete for an image (protected)
app.post('/api/projects/:id/images/undo', requireAuth, async (req,res)=>{
  const id = Number(req.params.id)
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url' })
  await db.read()
  const project = (db.data.projects || []).find(p=>p.id === id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  project.images = project.images || []
  const idx = project.images.findIndex(img => (typeof img === 'string' ? img === url : img.url === url || img.filename === path.basename(url)))
  if (idx === -1) return res.status(404).json({ error: 'Image not found on project' })
  const imgObj = project.images[idx]
  if (!imgObj.deleted) return res.status(400).json({ error: 'Image not deleted' })
  // move back from trash if possible
  try{
    const trashPath = path.join(uploadsDir, imgObj.trashFilename || 'trash/'+(imgObj.filename || path.basename(url)))
    const restoredPath = path.join(uploadsDir, imgObj.filename || path.basename(url))
    if (fs.existsSync(trashPath)) fs.renameSync(trashPath, restoredPath)
    imgObj.deleted = false
    delete imgObj.deletedAt
    delete imgObj.trashFilename
  }catch(err){
    console.warn('Failed to restore file from trash:', err && err.message)
  }
  await db.write()
  res.json({ restored: true })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`))
