import { useState, useEffect, useCallback } from 'react'
import { loadDocs, saveDoc, deleteDoc } from './supabase.js'

// ── Tokens (same as AppUI) ────────────────────────────────────────────────────
const C = {
  navy:"#1B2A4A", gold:"#C9A84C", surface:"#F7F8FC", white:"#FFFFFF",
  border:"#DDE2EE", text:"#1B2A4A", muted:"#6B7A99",
  ok:"#2D7A4F", danger:"#C0392B", pending:"#B45309",
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{minHeight:"100vh",background:C.surface,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{width:56,height:56,borderRadius:14,background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:28,color:C.navy}}>B</div>
      <div style={{fontWeight:800,fontSize:20,color:C.navy}}>BizDoc</div>
      <div style={{display:"flex",gap:6}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:10,height:10,borderRadius:"50%",background:C.gold,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>
        ))}
      </div>
      <div style={{fontSize:13,color:C.muted}}>กำลังโหลดข้อมูล...</div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style>
    </div>
  )
}

function ErrorScreen({ error, onRetry }) {
  return (
    <div style={{minHeight:"100vh",background:C.surface,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <div style={{fontSize:48}}>⚠️</div>
      <div style={{fontWeight:700,fontSize:16,color:C.danger}}>เชื่อมต่อฐานข้อมูลไม่ได้</div>
      <div style={{fontSize:13,color:C.muted,maxWidth:300,textAlign:"center"}}>{error}</div>
      <button onClick={onRetry} style={{background:C.navy,border:"none",borderRadius:8,color:"#fff",padding:"10px 24px",cursor:"pointer",fontSize:14,fontWeight:700,marginTop:8}}>ลองอีกครั้ง</button>
    </div>
  )
}

// ── Main App wrapper with Supabase sync ───────────────────────────────────────
// We import the full UI logic inline to avoid circular deps
import AppCore from './AppCore.jsx'

export default function App() {
  const [docs, setDocs] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('')

  const fetchDocs = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await loadDocs()
      setDocs(data)
      setStatus('ready')
    } catch (e) {
      setErrorMsg(e.message || 'Unknown error')
      setStatus('error')
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleSave = async (doc) => {
    try {
      await saveDoc(doc)
      setDocs(prev => {
        const exists = prev.find(d => d.id === doc.id)
        return exists ? prev.map(d => d.id === doc.id ? doc : d) : [doc, ...prev]
      })
      return true
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
      return false
    }
  }

  const handleDelete = async (id, mode, allDocs) => {
    const toRemove = new Set([String(id)])
    if (mode === 'chain') {
      const add = (pid) => allDocs.filter(d => String(d.parentId) === String(pid)).forEach(c => { toRemove.add(String(c.id)); add(c.id) })
      add(id)
    }
    try {
      await Promise.all([...toRemove].map(rid => deleteDoc(rid)))
      setDocs(prev => prev.filter(d => !toRemove.has(String(d.id))))
      return toRemove.size
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + e.message)
      return 0
    }
  }

  const handleToggleClosed = async (id) => {
    const doc = docs.find(d => d.id === id)
    if (!doc) return
    const updated = { ...doc, closed: !doc.closed }
    await handleSave(updated)
  }

  if (status === 'loading') return <LoadingScreen />
  if (status === 'error') return <ErrorScreen error={errorMsg} onRetry={fetchDocs} />

  return (
    <AppCore
      docs={docs}
      onSaveDoc={handleSave}
      onDeleteDoc={handleDelete}
      onToggleClosed={handleToggleClosed}
    />
  )
}
