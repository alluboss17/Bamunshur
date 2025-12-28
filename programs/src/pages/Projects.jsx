import React from 'react'
export default function Projects(){
  const [projects,setProjects] = React.useState(null)
  React.useEffect(()=>{
    fetch('http://localhost:3001/api/projects')
      .then(r=>r.json())
      .then(setProjects)
      .catch(()=>setProjects([]))
  },[])

  return (
    <section>
      <div className="card">
        <h1>Projects</h1>
      </div>
      {!projects && <div className="card">Loading projects…</div>}
      {projects && projects.map(p=>{
        const imgs = (p.images||[]).filter(img => (typeof img === 'string') ? true : !img.deleted)
        const first = imgs[0]
        const url = first ? (typeof first === 'string' ? first : first.url) : null
        return (
          <div key={p.id} className="card" style={{display:'flex',gap:12,alignItems:'center'}}>
            {url && (
              <img src={url} alt="project" style={{width:120,height:80,objectFit:'cover',borderRadius:6}} />
            )}
            <div>
              <h3>{p.title}</h3>
              <p>{p.location} — <strong>{p.status}</strong></p>
            </div>
          </div>
        )
      })}
    </section>
  )
}
