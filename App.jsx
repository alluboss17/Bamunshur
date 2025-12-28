import React from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Contact from './pages/Contact'
import Admin from './pages/Admin'

export default function App(){
  const [route, setRoute] = React.useState('home')
  return (
    <div>
      <Navbar onNavigate={setRoute}/>
      <main className="container">
        {route === 'home' && <Home />}
        {route === 'projects' && <Projects />}
        {route === 'contact' && <Contact />}
        {route === 'admin' && <Admin />}
      </main>
      <footer className="footer">© {new Date().getFullYear()} Bamunshur Model Town Housing Society</footer>
    </div>
  )
}
