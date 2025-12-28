import React from 'react'
export default function Admin(){
  const [projects,setProjects]=React.useState(null)
  const [form,setForm]=React.useState({title:'',location:'',status:''})
  const [editing,setEditing]=React.useState(null)
  const [token,setToken]=React.useState(localStorage.getItem('bmth_token')||null)
  const [loginForm,setLoginForm]=React.useState({username:'',password:''})

  React.useEffect(()=>{fetchProjects()},[])
  function fetchProjects(){
    fetch('http://localhost:3001/api/projects').then(r=>r.json()).then(setProjects).catch(()=>setProjects([]))
  }
  function update(e){setForm({...form,[e.target.name]:e.target.value})}
  function updateLogin(e){setLoginForm({...loginForm,[e.target.name]:e.target.value})}
  async function createOrUpdate(e){
    e.preventDefault()
    const headers = {'Content-Type':'application/json'}
    if (token) headers['Authorization'] = 'Bearer '+token
    if (editing){
      await fetch('http://localhost:3001/api/projects/'+editing.id,{method:'PUT',headers,body:JSON.stringify(form)})
    } else {
      await fetch('http://localhost:3001/api/projects',{method:'POST',headers,body:JSON.stringify(form)})
    }
    setForm({title:'',location:'',status:''})
    setEditing(null)
    fetchProjects()
  }
  async function uploadImage(projectId, file){
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    const headers = {}
    if (token) headers['Authorization'] = 'Bearer '+token
    const res = await fetch('http://localhost:3001/api/projects/'+projectId+'/images', { method: 'POST', headers, body: fd })
    if (res.ok) fetchProjects()
    else alert('Image upload failed')
  }
  async function remove(id){
    if(!confirm('Delete this project?')) return
    const headers = {}
    if (token) headers['Authorization'] = 'Bearer '+token
    await fetch('http://localhost:3001/api/projects/'+id,{method:'DELETE',headers})
    fetchProjects()
  }
  function startEdit(p){setEditing(p); setForm({title:p.title,location:p.location,status:p.status})}

  async function login(e){
    e && e.preventDefault()
    const res = await fetch('http://localhost:3001/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(loginForm)})
    if (res.ok){
      const data = await res.json()
      setToken(data.token)
      localStorage.setItem('bmth_token', data.token)
    } else {
      alert('Login failed')
    }
  }
  function logout(){
    setToken(null)
    localStorage.removeItem('bmth_token')
  }

  return (
    <section>
      <div className="card">
        <h1>Admin — Manage Projects</h1>
        {!token && (
          <form onSubmit={login} style={{display:'grid',gap:8,maxWidth:360}}>
            <input name="username" placeholder="Username" value={loginForm.username} onChange={updateLogin} required />
            <input name="password" placeholder="Password" value={loginForm.password} onChange={updateLogin} type="password" required />
            <div style={{display:'flex',gap:8}}>
              <button type="submit">Login</button>
            </div>
            <p style={{color:'#666'}}>Default: <strong>admin</strong> / <strong>admin123</strong></p>
          </form>
        )}

        {token && (
          <div>
            <div style={{marginBottom:12}}>
              <button onClick={logout}>Logout</button>
            </div>
            <form onSubmit={createOrUpdate} style={{display:'grid',gap:8}}>
              <input name="title" placeholder="Title" value={form.title} onChange={update} required />
              <input name="location" placeholder="Location" value={form.location} onChange={update} />
              <input name="status" placeholder="Status (Available / Sold Out)" value={form.status} onChange={update} />
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button type="submit">{editing? 'Update' : 'Create'}</button>
                {editing && <button type="button" onClick={()=>{setEditing(null); setForm({title:'',location:'',status:''})}}>Cancel</button>}
                <label style={{display:'inline-flex',alignItems:'center',gap:8}}>Upload image:
                  <input type="file" accept="image/*" onChange={async (e)=>{
                    const f = e.target.files && e.target.files[0]
                    if (!f) return
                    // if creating new project, create it first then upload
                    if (!editing){
                      const headers = {'Content-Type':'application/json'}
                      if (token) headers['Authorization'] = 'Bearer '+token
                      const res = await fetch('http://localhost:3001/api/projects',{method:'POST',headers,body:JSON.stringify(form)})
                      if (res.ok){
                        const data = await res.json()
                        await uploadImage(data.id, f)
                        setForm({title:'',location:'',status:''})
                        fetchProjects()
                      } else alert('Create project first')
                    } else {
                      await uploadImage(editing.id, f)
                    }
                  }} />
                </label>
              </div>
            </form>
          </div>
        )}
      </div>
      <div className="card">
        <h2>Existing Projects</h2>
        {!projects && <div>Loading…</div>}
        {projects && projects.length === 0 && <div>No projects yet.</div>}
        {projects && projects.map(p=>(
          <div key={p.id} style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div>
                <strong>{p.title}</strong> — {p.location} <em>({p.status})</em>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>startEdit(p)}>Edit</button>
                <button onClick={()=>remove(p.id)}>Delete</button>
              </div>
            </div>

            {p.images && p.images.length > 0 && (
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                {p.images.map((img,i)=>{
                  const imageObj = (typeof img === 'string') ? { url: img, deleted: false } : img
                  return (
                    <div key={i} style={{display:'inline-flex',flexDirection:'column',alignItems:'center'}}>
                      <img src={imageObj.url} alt={`img-${i}`} style={{width:120,height:80,objectFit:'cover',borderRadius:6,opacity:imageObj.deleted?0.5:1}} />
                      {!imageObj.deleted && (
                        <button style={{marginTop:6}} onClick={async ()=>{
                          if(!confirm('Delete this image?')) return
                          const headers = {'Content-Type':'application/json'}
                          if (token) headers['Authorization'] = 'Bearer '+token
                          const res = await fetch('http://localhost:3001/api/projects/'+p.id+'/images',{method:'DELETE',headers,body:JSON.stringify({url:imageObj.url})})
                          if (res.ok) fetchProjects()
                          else alert('Failed to delete image')
                        }}>Delete image</button>
                      )}
                      {imageObj.deleted && (
                        <button style={{marginTop:6}} onClick={async ()=>{
                          const headers = {'Content-Type':'application/json'}
                          if (token) headers['Authorization'] = 'Bearer '+token
                          const res = await fetch('http://localhost:3001/api/projects/'+p.id+'/images/undo',{method:'POST',headers,body:JSON.stringify({url:imageObj.url})})
                          if (res.ok) fetchProjects()
                          else alert('Failed to restore image')
                        }}>Undo delete</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
