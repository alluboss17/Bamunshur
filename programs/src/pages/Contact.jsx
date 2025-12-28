import React from 'react'
export default function Contact(){
  const [form,setForm]=React.useState({name:'',email:'',message:''})
  const [status,setStatus]=React.useState(null)
  function update(e){setForm({...form,[e.target.name]:e.target.value})}
  async function submit(e){
    e.preventDefault()
    setStatus('loading')
    try{
      const res = await fetch('http://localhost:3001/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      if (res.ok){
        setStatus('sent')
        setForm({name:'',email:'',message:''})
      } else {
        setStatus('error')
      }
    }catch(err){
      setStatus('error')
    }
  }
  return (
    <section>
      <div className="card">
        <h1>Contact</h1>
        <form onSubmit={submit}>
          <div style={{display:'grid',gap:8}}>
            <input name="name" placeholder="Your name" value={form.name} onChange={update}/>
            <input name="email" placeholder="Email" value={form.email} onChange={update}/>
            <textarea name="message" placeholder="Message" value={form.message} onChange={update}/>
            <button type="submit">Send</button>
          </div>
        </form>
        {status==='loading' && <p>Sending…</p>}
        {status==='sent' && <p>Thanks — your message was sent.</p>}
        {status==='error' && <p>Sorry, something went wrong.</p>}
      </div>
    </section>
  )
}
