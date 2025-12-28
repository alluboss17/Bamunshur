import React from 'react'
export default function Navbar({onNavigate}) {
  const [active,setActive] = React.useState('home')
  function nav(to){
    setActive(to)
    onNavigate(to)
  }
  return (
    <nav className="nav">
      <div className="brand">Bamunshur Model Town</div>
      <div style={{marginLeft:'auto',display:'flex',gap:8}}>
        <button className={active==='home'?'active':''} onClick={()=>nav('home')}>Home</button>
        <button className={active==='projects'?'active':''} onClick={()=>nav('projects')}>Projects</button>
        <button className={active==='contact'?'active':''} onClick={()=>nav('contact')}>Contact</button>
        <button className={active==='admin'?'active':''} onClick={()=>nav('admin')}>Admin</button>
      </div>
    </nav>
  )
}
