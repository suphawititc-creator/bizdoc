import { useState } from 'react'

import { useState } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  navy:"#1B2A4A", gold:"#C9A84C", surface:"#F7F8FC", white:"#FFFFFF",
  border:"#DDE2EE", text:"#1B2A4A", muted:"#6B7A99", tag:"#EEF1FA",
  ok:"#2D7A4F", danger:"#C0392B", pending:"#B45309", closed:"#4B5563",
  qt:"#2D7A4F", iv:"#1B5FA6", rc:"#7B3FC9",
};
const TYPE = {
  quotation:{ label:"ใบเสนอราคา",   short:"QT", color:C.qt },
  invoice:  { label:"ใบแจ้งหนี้",    short:"IV", color:C.iv },
  receipt:  { label:"ใบเสร็จรับเงิน",short:"RC", color:C.rc },
};
const VAT = 0.07;
const pad = n => String(n).padStart(2,"0");
const today = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const uid   = () => Date.now()+Math.random();
const genNo = t => { const d=new Date(); return `${TYPE[t].short}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(Math.random()*9000)+1000}`; };
const fmt   = n => Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});

function calcDoc(doc) {
  const sub = (doc.items||[]).reduce((s,it)=>{
    const raw=(it.qty||0)*(it.price||0);
    return s+raw-Math.min(it.discount||0,raw);
  },0);
  const vat = doc.vatEnabled ? sub*VAT : 0;
  return {sub,vat,total:sub+vat};
}
function newItem(){ return {id:uid(),desc:"",qty:1,unit:"ชิ้น",price:0,discount:0}; }
function newDoc(type,parent=null){
  const base={
    id:uid(),type,docNumber:genNo(type),date:today(),dueDate:today(),
    company:parent?.company||{name:"",address:"",taxId:"",phone:"",email:""},
    client: parent?.client ||{name:"",address:"",taxId:"",phone:"",email:""},
    items:  parent?.items ? parent.items.map(it=>({...it,id:uid()})) : [newItem()],
    note:"",vatEnabled:parent?.vatEnabled??true,parentId:parent?.id||null,
  };
  if(type==="receipt")   base.paid=false;
  if(type==="quotation") base.closed=false;
  return base;
}

// ── Tiny shared ───────────────────────────────────────────────────────────────
const INP = { width:"100%",border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",fontSize:13,color:C.text,background:C.white,outline:"none",boxSizing:"border-box" };
const LBL = { fontSize:11,fontWeight:700,color:C.muted,letterSpacing:.5,textTransform:"uppercase",marginBottom:4,display:"block" };

function Chip({type,small}){
  const t=TYPE[type];
  return <span style={{background:t.color+"18",color:t.color,border:`1px solid ${t.color}40`,borderRadius:20,padding:small?"1px 8px":"2px 10px",fontSize:small?11:12,fontWeight:700}}>{t.label}</span>;
}
function Toast({msg,color}){
  return <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:color||C.ok,color:"#fff",borderRadius:10,padding:"12px 20px",fontWeight:700,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>{msg}</div>;
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({doc,docs,onConfirm,onCancel}){
  const children = docs.filter(d=>d.parentId===doc.id);
  const t=TYPE[doc.type];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:16,padding:28,maxWidth:420,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:22,marginBottom:8}}>🗑️</div>
        <div style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:6}}>ลบ{t.label}?</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{doc.docNumber} · {doc.client?.name||"—"}</div>
        {children.length>0&&<div style={{background:"#FEF3C7",border:"1px solid #F59E0B40",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#92400E",marginBottom:16}}>
          ⚠️ มีเอกสารที่เชื่อมโยง {children.length} ฉบับ
        </div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={()=>onConfirm("single")} style={{background:C.danger,border:"none",borderRadius:8,color:"#fff",padding:"10px",cursor:"pointer",fontWeight:700,fontSize:13}}>ลบเฉพาะเอกสารนี้</button>
          {children.length>0&&<button onClick={()=>onConfirm("chain")} style={{background:"#7F1D1D",border:"none",borderRadius:8,color:"#fff",padding:"10px",cursor:"pointer",fontWeight:700,fontSize:13}}>ลบทั้ง Chain ({children.length+1} ฉบับ)</button>}
          <button onClick={onCancel} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,padding:"10px",cursor:"pointer",fontWeight:600,fontSize:13}}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

// ── DocForm ───────────────────────────────────────────────────────────────────
function DocForm({doc,onChange,onSave,onCancel}){
  const set=(path,val)=>{
    const clone=JSON.parse(JSON.stringify(doc));
    const keys=path.split("."); let o=clone;
    keys.slice(0,-1).forEach(k=>o=o[k]); o[keys.at(-1)]=val; onChange(clone);
  };
  const setIt=(id,f,v)=>{
    const c=JSON.parse(JSON.stringify(doc));
    const it=c.items.find(x=>x.id===id);
    if(it) it[f]=(f==="qty"||f==="price"||f==="discount")?Number(v):v;
    onChange(c);
  };
  const addIt=()=>{ const c=JSON.parse(JSON.stringify(doc)); c.items.push(newItem()); onChange(c); };
  const delIt=id=>{ const c=JSON.parse(JSON.stringify(doc)); c.items=c.items.filter(x=>x.id!==id); onChange(c); };
  const {sub,vat,total}=calcDoc(doc);
  const t=TYPE[doc.type];
  const sec={fontSize:12,fontWeight:700,color:t.color,letterSpacing:1,textTransform:"uppercase",marginBottom:10,paddingBottom:5,borderBottom:`2px solid ${t.color}30`};
  const rawTotal=(doc.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  const totalDisc=(doc.items||[]).reduce((s,it)=>s+Math.min(it.discount||0,(it.qty||0)*(it.price||0)),0);

  return (
    <div style={{background:C.surface,minHeight:"100vh",padding:24}}>
      <div style={{maxWidth:880,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button onClick={onCancel} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:20}}>←</button>
          <div style={{width:36,height:36,borderRadius:8,background:t.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:13}}>{t.short}</div>
          <div><div style={{fontWeight:800,color:C.navy,fontSize:16}}>{t.label}</div><div style={{fontSize:12,color:C.muted}}>{doc.docNumber}</div></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* Doc info */}
          <div style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
            <div style={sec}>ข้อมูลเอกสาร</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={LBL}>เลขที่</label><input style={INP} value={doc.docNumber} onChange={e=>set("docNumber",e.target.value)}/></div>
              <div><label style={LBL}>วันที่</label><input type="date" style={INP} value={doc.date} onChange={e=>set("date",e.target.value)}/></div>
              {doc.type!=="receipt"&&<div><label style={LBL}>{doc.type==="quotation"?"หมดอายุ":"ครบกำหนด"}</label><input type="date" style={INP} value={doc.dueDate} onChange={e=>set("dueDate",e.target.value)}/></div>}
            </div>
            <div style={{marginTop:10}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={doc.vatEnabled} onChange={e=>set("vatEnabled",e.target.checked)} style={{width:15,height:15,accentColor:t.color}}/>
                <span style={{fontWeight:600}}>คำนวณ VAT 7%</span>
              </label>
              {doc.type==="receipt"&&<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,marginTop:8}}>
                <input type="checkbox" checked={doc.paid} onChange={e=>set("paid",e.target.checked)} style={{width:15,height:15,accentColor:C.ok}}/>
                <span style={{fontWeight:600}}>ชำระเงินแล้ว</span>
              </label>}
            </div>
          </div>

          {/* Company */}
          <div style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
            <div style={sec}>ผู้ออกเอกสาร</div>
            {["name","address","taxId","phone","email"].map(f=>(
              <div key={f} style={{marginBottom:7}}>
                <label style={LBL}>{{name:"ชื่อบริษัท",address:"ที่อยู่",taxId:"เลขผู้เสียภาษี",phone:"โทรศัพท์",email:"อีเมล"}[f]}</label>
                <input style={INP} value={doc.company[f]} onChange={e=>set(`company.${f}`,e.target.value)}/>
              </div>
            ))}
          </div>

          {/* Client */}
          <div style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
            <div style={sec}>ลูกค้า</div>
            {["name","address","taxId","phone","email"].map(f=>(
              <div key={f} style={{marginBottom:7}}>
                <label style={LBL}>{{name:"ชื่อลูกค้า",address:"ที่อยู่",taxId:"เลขผู้เสียภาษี",phone:"โทรศัพท์",email:"อีเมล"}[f]}</label>
                <input style={INP} value={doc.client[f]} onChange={e=>set(`client.${f}`,e.target.value)}/>
              </div>
            ))}
          </div>

          {/* Note */}
          <div style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
            <div style={sec}>หมายเหตุ</div>
            <textarea style={{...INP,height:100,resize:"vertical",fontFamily:"inherit"}} value={doc.note} onChange={e=>set("note",e.target.value)} placeholder="เงื่อนไขการชำระเงิน..."/>
          </div>

          {/* Items */}
          <div style={{gridColumn:"1/-1",background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
            <div style={sec}>รายการสินค้า / บริการ</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:C.tag}}>
                    {["#","รายการ","จำนวน","หน่วย","ราคา/หน่วย","ส่วนลด (฿)","รวม",""].map((h,i)=>(
                      <th key={i} style={{padding:"8px 10px",textAlign:i>=2?"right":"left",color:C.muted,fontWeight:700,fontSize:11,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((it,idx)=>{
                    const raw=(it.qty||0)*(it.price||0);
                    const disc=Math.min(it.discount||0,raw);
                    const net=raw-disc;
                    const pct=raw>0?((disc/raw)*100).toFixed(1):"0.0";
                    return (
                      <tr key={it.id} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:"8px 10px",color:C.muted,fontSize:12}}>{idx+1}</td>
                        <td style={{padding:"6px 8px"}}><input style={{...INP,minWidth:160}} value={it.desc} placeholder="รายละเอียด" onChange={e=>setIt(it.id,"desc",e.target.value)}/></td>
                        <td style={{padding:"6px 4px"}}><input type="number" style={{...INP,width:65,textAlign:"right"}} value={it.qty} min={0} onChange={e=>setIt(it.id,"qty",e.target.value)}/></td>
                        <td style={{padding:"6px 4px"}}><input style={{...INP,width:55}} value={it.unit} onChange={e=>setIt(it.id,"unit",e.target.value)}/></td>
                        <td style={{padding:"6px 4px"}}><input type="number" style={{...INP,width:95,textAlign:"right"}} value={it.price} min={0} onChange={e=>setIt(it.id,"price",e.target.value)}/></td>
                        <td style={{padding:"6px 4px"}}>
                          <input type="number" style={{...INP,width:85,textAlign:"right"}} value={it.discount||0} min={0} onChange={e=>setIt(it.id,"discount",e.target.value)}/>
                          {disc>0&&<div style={{fontSize:10,color:C.danger,textAlign:"right",marginTop:2}}>({pct}%)</div>}
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700}}>
                          {fmt(net)}
                          {disc>0&&<div style={{fontSize:10,color:C.muted,textDecoration:"line-through",fontWeight:400}}>{fmt(raw)}</div>}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {doc.items.length>1&&<button onClick={()=>delIt(it.id)} style={{background:"#FEE2E2",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",color:C.danger,fontWeight:700,fontSize:16}}>×</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={addIt} style={{marginTop:10,background:"none",border:`1.5px dashed ${t.color}`,color:t.color,borderRadius:8,padding:"6px 16px",fontSize:13,cursor:"pointer",fontWeight:600}}>+ เพิ่มรายการ</button>
            {/* Totals */}
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              <div style={{minWidth:270}}>
                {totalDisc>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>ราคาก่อนส่วนลด</span><span>{fmt(rawTotal)} ฿</span></div>}
                {totalDisc>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.danger,borderBottom:`1px solid ${C.border}`}}><span>ส่วนลดรวม</span><span>-{fmt(totalDisc)} ฿</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>ยอดก่อนภาษี</span><span>{fmt(sub)} ฿</span></div>
                {doc.vatEnabled&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>VAT 7%</span><span>{fmt(vat)} ฿</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,background:t.color,color:"#fff",fontWeight:800,fontSize:15,marginTop:8}}><span>ยอดรวมทั้งสิ้น</span><span>{fmt(total)} ฿</span></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={onCancel} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:13,color:C.muted,fontWeight:600}}>ยกเลิก</button>
          <button onClick={onSave} style={{background:t.color,border:"none",borderRadius:8,color:"#fff",padding:"10px 28px",cursor:"pointer",fontSize:13,fontWeight:700}}>💾 บันทึกเอกสาร</button>
        </div>
      </div>
    </div>
  );
}

// ── DocPreview ────────────────────────────────────────────────────────────────
function DocPreview({doc,docs,onEdit,onDelete,onBack,onCreateChild,onSelect,onToggleClosed}){
  const [delTarget,setDelTarget]=useState(null);
  const {sub,vat,total}=calcDoc(doc);
  const t=TYPE[doc.type];
  const invoices=docs.filter(d=>d.type==="invoice"&&d.parentId===doc.id).sort((a,b)=>a.id-b.id);
  const receipts=docs.filter(d=>d.type==="receipt"&&d.parentId===doc.id).sort((a,b)=>a.id-b.id);
  const pendingIvs=invoices.filter(iv=>!docs.some(d=>d.type==="receipt"&&d.parentId===iv.id));
  const openDel=(id,e)=>{ if(e) e.stopPropagation(); setDelTarget(id); };
  const rawTotal=(doc.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  const totalDisc=(doc.items||[]).reduce((s,it)=>s+Math.min(it.discount||0,(it.qty||0)*(it.price||0)),0);
  const modalDoc=delTarget?docs.find(d=>d.id===delTarget):null;

  return (
    <div style={{background:C.surface,minHeight:"100vh",padding:24}}>
      {modalDoc&&<DeleteModal doc={modalDoc} docs={docs} onConfirm={mode=>{setDelTarget(null);onDelete(modalDoc.id,mode);}} onCancel={()=>setDelTarget(null)}/>}
      <div style={{maxWidth:820,margin:"0 auto"}}>
        {/* Toolbar */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:20,padding:"4px 8px"}}>←</button>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <Chip type={doc.type}/>
            {doc.type==="quotation"&&(doc.closed
              ?<span style={{fontSize:11,background:`${C.closed}15`,color:C.closed,border:`1px solid ${C.closed}40`,borderRadius:20,padding:"2px 10px",fontWeight:700}}>✔ เสร็จแล้ว</span>
              :<span style={{fontSize:11,background:"#EFF6FF",color:C.iv,border:`1px solid ${C.iv}30`,borderRadius:20,padding:"2px 10px",fontWeight:700}}>🔄 กำลังดำเนินการ</span>
            )}
          </div>
          {doc.type==="quotation"&&(
            <button onClick={()=>onToggleClosed(doc.id)} style={{background:doc.closed?"#EFF6FF":C.ok,border:`1px solid ${doc.closed?C.iv:C.ok}`,borderRadius:8,color:doc.closed?C.iv:"#fff",padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>
              {doc.closed?"🔄 เปิดงานอีกครั้ง":"✔ ปิดงาน (เสร็จแล้ว)"}
            </button>
          )}
          <button onClick={onEdit} style={{background:C.navy,border:"none",borderRadius:8,color:"#fff",padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>✏️ แก้ไข</button>
          <button onClick={e=>openDel(doc.id,e)} style={{background:"#FEE2E2",border:"none",borderRadius:8,color:C.danger,padding:"7px 12px",cursor:"pointer",fontSize:13,fontWeight:600}}>🗑️</button>
        </div>

        {/* Closed banner */}
        {doc.type==="quotation"&&doc.closed&&(
          <div style={{background:`${C.closed}0D`,border:`1.5px solid ${C.closed}30`,borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>✔</span>
            <div><div style={{fontWeight:700,color:C.closed,fontSize:13}}>งานดำเนินการเสร็จสิ้นแล้ว</div>
            <div style={{fontSize:12,color:C.muted}}>กดปุ่ม "เปิดงานอีกครั้ง" เพื่อย้ายกลับ</div></div>
          </div>
        )}

        {/* QT → invoices panel */}
        {doc.type==="quotation"&&(
          <div style={{background:C.white,border:`1.5px solid ${C.iv}30`,borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontWeight:700,color:C.iv,fontSize:14}}>📄 ใบแจ้งหนี้ {invoices.length>0?`(${invoices.length} ฉบับ)`:""}</div>
              <button onClick={()=>onCreateChild("invoice",doc)} style={{background:C.iv,border:"none",borderRadius:8,color:"#fff",padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>+ สร้างใบแจ้งหนี้</button>
            </div>
            {invoices.length===0&&<div style={{fontSize:12,color:C.muted}}>ยังไม่มีใบแจ้งหนี้</div>}
            {invoices.map(iv=>{
              const ivTotal=calcDoc(iv).total;
              const ivRcs=docs.filter(d=>d.type==="receipt"&&d.parentId===iv.id);
              const ivRcvd=ivRcs.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
              const ivRemain=ivTotal-ivRcvd;
              const ivFull=ivRcs.length>0&&ivRemain<=0;
              const ivNone=ivRcs.length===0;
              return (
                <div key={iv.id} style={{borderRadius:8,border:`1.5px solid ${ivNone?C.pending+"40":ivFull?C.ok+"40":C.iv+"30"}`,background:ivNone?`${C.pending}06`:ivFull?`${C.ok}06`:C.surface,marginBottom:8,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px"}}>
                    <div onClick={()=>onSelect(iv.id)} style={{display:"flex",alignItems:"center",gap:10,flex:1,cursor:"pointer",minWidth:0}}>
                      <div style={{width:28,height:28,borderRadius:6,background:C.iv+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:C.iv,flexShrink:0}}>IV</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13,color:C.navy}}>{iv.docNumber}</div>
                        <div style={{fontSize:11,color:C.muted}}>{iv.date}{iv.dueDate?` · ครบ ${iv.dueDate}`:""}</div>
                      </div>
                      <div style={{textAlign:"right",marginRight:8}}>
                        <div style={{fontSize:13,fontWeight:800,color:C.iv}}>{fmt(ivTotal)} ฿</div>
                      </div>
                      {ivNone&&<span style={{fontSize:10,background:`${C.pending}18`,color:C.pending,border:`1px solid ${C.pending}40`,borderRadius:20,padding:"2px 8px",fontWeight:700,whiteSpace:"nowrap"}}>⏳ ยังไม่รับชำระ</span>}
                      {!ivNone&&!ivFull&&<span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",borderRadius:20,padding:"2px 8px",fontWeight:700,whiteSpace:"nowrap"}}>⚡ บางส่วน</span>}
                      {ivFull&&<span style={{fontSize:10,background:"#D1FAE5",color:C.ok,borderRadius:20,padding:"2px 8px",fontWeight:700,whiteSpace:"nowrap"}}>✅ ครบแล้ว</span>}
                      <span style={{color:C.muted,fontSize:14}}>›</span>
                    </div>
                    <button onClick={e=>openDel(iv.id,e)} style={{flexShrink:0,background:"#FEE2E2",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",color:C.danger,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                  </div>
                  {!ivNone&&(
                    <div style={{borderTop:`1px solid ${C.border}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:C.white}}>
                      {[{lb:"🧾 ใบเสร็จ",val:`${ivRcs.length} ฉบับ`,c:C.rc},{lb:"✅ รับแล้ว",val:`${fmt(ivRcvd)} ฿`,c:C.ok},{lb:"⏳ คงเหลือ",val:ivRemain>0?`${fmt(ivRemain)} ฿`:"ครบแล้ว",c:ivRemain>0?C.pending:C.ok}].map((s,i)=>(
                        <div key={i} style={{textAlign:"center",padding:"6px 4px",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
                          <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{s.lb}</div>
                          <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!ivNone&&ivTotal>0&&<div style={{height:3,background:C.border}}><div style={{height:"100%",width:`${Math.min(100,(ivRcvd/ivTotal)*100)}%`,background:ivFull?C.ok:C.pending}}/></div>}
                </div>
              );
            })}
            {pendingIvs.length>0&&<div style={{marginTop:4,padding:"8px 12px",borderRadius:8,background:`${C.pending}10`,fontSize:12,color:C.pending,fontWeight:600}}>
              ⏳ ค้างชำระ {pendingIvs.length} ฉบับ · {fmt(pendingIvs.reduce((s,iv)=>s+calcDoc(iv).total,0))} ฿
            </div>}
          </div>
        )}

        {/* IV → receipts panel */}
        {doc.type==="invoice"&&(()=>{
          const rcvd=receipts.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
          const remain=total-rcvd;
          const full=receipts.length>0&&remain<=0;
          return (
            <div style={{background:C.white,border:`1.5px solid ${C.rc}30`,borderRadius:12,padding:16,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontWeight:700,color:C.rc,fontSize:14}}>🧾 ใบเสร็จ {receipts.length>0?`(${receipts.length} ฉบับ)`:""}</div>
                <button onClick={()=>onCreateChild("receipt",doc)} style={{background:C.rc,border:"none",borderRadius:8,color:"#fff",padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>+ สร้างใบเสร็จ</button>
              </div>
              {receipts.length>0&&(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:10,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                    {[{lb:"🧾 ใบเสร็จ",val:`${receipts.length} ฉบับ`,c:C.rc},{lb:"✅ รับแล้ว",val:`${fmt(rcvd)} ฿`,c:C.ok},{lb:"⏳ คงเหลือ",val:remain>0?`${fmt(remain)} ฿`:"ครบแล้ว ✅",c:remain>0?C.pending:C.ok}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center",padding:"8px 4px",background:C.surface,borderRight:i<2?`1px solid ${C.border}`:"none"}}>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{s.lb}</div>
                        <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{height:4,background:C.border,borderRadius:2,marginBottom:10}}><div style={{height:"100%",borderRadius:2,width:`${Math.min(100,(rcvd/total)*100)}%`,background:full?C.ok:C.pending}}/></div>
                </>
              )}
              {receipts.length===0&&<div style={{fontSize:12,color:C.muted,marginBottom:8}}>ยังไม่มีใบเสร็จ</div>}
              {receipts.map(rc=>(
                <div key={rc.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,background:rc.paid?C.surface:`${C.pending}08`,border:`1px solid ${rc.paid?C.border:C.pending+"40"}`,marginBottom:6}}>
                  <div onClick={()=>onSelect(rc.id)} style={{display:"flex",alignItems:"center",gap:10,flex:1,cursor:"pointer",minWidth:0}}>
                    <div style={{width:28,height:28,borderRadius:6,background:C.rc+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:C.rc,flexShrink:0}}>RC</div>
                    <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.navy}}>{rc.docNumber}</div><div style={{fontSize:11,color:C.muted}}>{rc.date} · {fmt(calcDoc(rc).total)} ฿</div></div>
                    {rc.paid?<span style={{fontSize:11,background:"#D1FAE5",color:C.ok,borderRadius:20,padding:"2px 8px",fontWeight:700}}>✅ ชำระแล้ว</span>
                            :<span style={{fontSize:11,background:`${C.pending}18`,color:C.pending,border:`1px solid ${C.pending}40`,borderRadius:20,padding:"2px 8px",fontWeight:700}}>⏳ ยังไม่ชำระ</span>}
                    <span style={{color:C.muted,fontSize:14}}>›</span>
                  </div>
                  <button onClick={e=>openDel(rc.id,e)} style={{flexShrink:0,background:"#FEE2E2",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",color:C.danger,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                </div>
              ))}
              {receipts.length===0&&<div style={{padding:"8px 12px",borderRadius:8,background:`${C.pending}10`,fontSize:12,color:C.pending,fontWeight:600}}>⏳ ยังไม่มีการรับชำระ · ค้าง {fmt(total)} ฿</div>}
            </div>
          );
        })()}

        {/* RC → parent */}
        {doc.type==="receipt"&&doc.parentId&&(()=>{
          const p=docs.find(d=>d.id===doc.parentId);
          return p?(<div onClick={()=>onSelect(p.id)} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>🔗</span>
            <div style={{flex:1}}><div style={{fontSize:11,color:C.muted,fontWeight:600}}>อ้างอิงจาก</div><div style={{fontWeight:700,fontSize:13,color:C.iv}}>{p.docNumber} · {p.client?.name||"—"}</div></div>
            <span style={{color:C.muted,fontSize:14}}>›</span>
          </div>):null;
        })()}

        {/* Paper */}
        <div style={{background:C.white,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 16px rgba(27,42,74,.08)"}}>
          <div style={{height:6,background:`linear-gradient(90deg,${t.color},${t.color}80)`}}/>
          <div style={{padding:"24px 28px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <div style={{fontSize:22,fontWeight:900,color:t.color}}>{t.label}</div>
                <div style={{fontSize:13,color:C.muted,marginTop:2}}>เลขที่ {doc.docNumber}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:1}}>วันที่ {doc.date}</div>
                {doc.type!=="receipt"&&doc.dueDate&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>{doc.type==="quotation"?"หมดอายุ":"ครบกำหนด"}: {doc.dueDate}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                {doc.type==="receipt"&&doc.paid&&<div style={{border:`3px solid ${C.ok}`,color:C.ok,borderRadius:8,padding:"5px 16px",fontWeight:900,fontSize:16,transform:"rotate(-8deg)"}}>ชำระแล้ว</div>}
                {doc.type==="invoice"&&receipts.length===0&&<div style={{border:`3px solid ${C.pending}`,color:C.pending,borderRadius:8,padding:"5px 12px",fontWeight:900,fontSize:14,transform:"rotate(-6deg)",background:`${C.pending}0A`}}>⏳ ค้างชำระ</div>}
                {doc.type==="receipt"&&!doc.paid&&<div style={{border:`3px solid ${C.pending}`,color:C.pending,borderRadius:8,padding:"5px 12px",fontWeight:900,fontSize:14,transform:"rotate(-6deg)",background:`${C.pending}0A`}}>⏳ ยังไม่ชำระ</div>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              {[{lb:"จาก",d:doc.company},{lb:"ถึง",d:doc.client}].map(({lb,d})=>(
                <div key={lb} style={{background:C.tag,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:10,fontWeight:800,color:t.color,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{lb}</div>
                  <div style={{fontWeight:700,fontSize:14,color:C.navy}}>{d.name||"—"}</div>
                  {d.address&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>{d.address}</div>}
                  {d.taxId&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>เลขผู้เสียภาษี: {d.taxId}</div>}
                  {d.phone&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>โทร: {d.phone}</div>}
                  {d.email&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>{d.email}</div>}
                </div>
              ))}
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:18}}>
              <thead><tr style={{background:t.color}}>
                {["#","รายการ","จำนวน","หน่วย","ราคา/หน่วย","ส่วนลด (฿)","รวม"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 10px",color:"#fff",fontWeight:700,textAlign:i>=2?"right":"left",fontSize:12}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {doc.items.map((it,idx)=>{
                  const raw=(it.qty||0)*(it.price||0);
                  const disc=Math.min(it.discount||0,raw);
                  const net=raw-disc;
                  const pct=raw>0?((disc/raw)*100).toFixed(1):"0.0";
                  return (
                    <tr key={it.id} style={{background:idx%2===0?C.white:C.surface}}>
                      <td style={{padding:"8px 10px",color:C.muted}}>{idx+1}</td>
                      <td style={{padding:"8px 10px"}}>{it.desc||"—"}</td>
                      <td style={{padding:"8px 10px",textAlign:"right"}}>{it.qty}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",color:C.muted}}>{it.unit}</td>
                      <td style={{padding:"8px 10px",textAlign:"right"}}>{fmt(it.price)}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",color:disc>0?C.danger:C.muted}}>
                        {disc>0?<div><div style={{fontWeight:700}}>-{fmt(disc)}</div><div style={{fontSize:10,color:C.muted}}>({pct}%)</div></div>:"—"}
                      </td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700}}>
                        {fmt(net)}
                        {disc>0&&<div style={{fontSize:10,color:C.muted,textDecoration:"line-through",fontWeight:400}}>{fmt(raw)}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
              <div style={{width:280}}>
                {totalDisc>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>ราคาก่อนส่วนลด</span><span>{fmt(rawTotal)} ฿</span></div>}
                {totalDisc>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.danger,borderBottom:`1px solid ${C.border}`}}><span>ส่วนลดรวม</span><span>-{fmt(totalDisc)} ฿</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>ยอดก่อนภาษี</span><span>{fmt(sub)} ฿</span></div>
                {doc.vatEnabled&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>VAT 7%</span><span>{fmt(vat)} ฿</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,background:t.color,color:"#fff",fontWeight:800,fontSize:15,marginTop:8}}><span>ยอดรวมทั้งสิ้น</span><span>{fmt(total)} ฿</span></div>
              </div>
            </div>
            {doc.note&&<div style={{background:C.tag,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.muted}}><strong style={{color:C.text}}>หมายเหตุ: </strong>{doc.note}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({docs,onCreate,onSelect,onDelete,onAI}){
  const [filter,setFilter]=useState("all");
  const [qtTab,setQtTab]=useState("active");
  const [search,setSearch]=useState("");
  const [expandPending,setExpandPending]=useState(true);

  const getIvStatus=iv=>docs.filter(d=>d.type==="receipt"&&d.parentId===iv.id).length===0?"pending":"paid";
  const getQtStatus=qt=>{
    const invs=docs.filter(d=>d.type==="invoice"&&d.parentId===qt.id);
    return invs.length===0?"no_invoice":invs.some(iv=>getIvStatus(iv)==="pending")?"pending":"paid";
  };

  const allQts=docs.filter(d=>d.type==="quotation");
  const allIvs=docs.filter(d=>d.type==="invoice");
  const allRcs=docs.filter(d=>d.type==="receipt");
  const totalQt=allQts.reduce((s,d)=>s+calcDoc(d).total,0);
  const totalIv=allIvs.reduce((s,d)=>s+calcDoc(d).total,0);
  const revenue=allRcs.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
  const pendingIvs=allIvs.filter(iv=>getIvStatus(iv)==="pending");
  const pendingAmt=pendingIvs.reduce((s,iv)=>s+calcDoc(iv).total,0);
  const pendingCount=pendingIvs.length;
  const activeQts=allQts.filter(d=>!d.closed).length;
  const closedQts=allQts.filter(d=>d.closed).length;

  const pendingByQt=allQts.map(qt=>{
    const myIvs=docs.filter(d=>d.type==="invoice"&&d.parentId===qt.id).filter(iv=>getIvStatus(iv)==="pending");
    return {qt,ivs:myIvs,amt:myIvs.reduce((s,iv)=>s+calcDoc(iv).total,0)};
  }).filter(g=>g.ivs.length>0);

  const filtered=docs.filter(d=>{
    if(filter==="pending"){ if(d.type==="quotation") return getQtStatus(d)==="pending"&&!d.closed; if(d.type==="invoice") return getIvStatus(d)==="pending"; return false; }
    if(filter!=="all"&&d.type!==filter) return false;
    if(d.type==="quotation"&&qtTab!=="all"){ if(qtTab==="active"&&d.closed) return false; if(qtTab==="closed"&&!d.closed) return false; }
    const q=search.toLowerCase();
    return !q||d.docNumber.toLowerCase().includes(q)||(d.client.name||"").toLowerCase().includes(q);
  }).sort((a,b)=>b.id-a.id);

  const hasAny=docs.length>0;

  return (
    <div style={{background:C.surface,minHeight:"100vh"}}>
      {/* Nav */}
      <div style={{background:C.navy,padding:"0 24px"}}>
        <div style={{maxWidth:1060,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,color:C.navy}}>B</div>
            <span style={{color:"#fff",fontWeight:800,fontSize:16}}>BizDoc</span>
            <span style={{color:C.gold+"80",fontSize:12}}>ระบบเอกสารธุรกิจ</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onAI} style={{background:"linear-gradient(135deg,#7C3AED,#4F46E5)",border:"none",borderRadius:8,color:"#fff",padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:700}}>🤖 AI วิเคราะห์</button>
            <button onClick={()=>onCreate("quotation")} style={{background:C.qt,border:"none",borderRadius:8,color:"#fff",padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:700}}>+ ใบเสนอราคา</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"20px 24px"}}>
        {/* Stats 3-col */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:16}}>
          {/* Col1: counts */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{background:C.navy,padding:"9px 14px"}}><div style={{fontSize:11,fontWeight:800,color:C.gold,letterSpacing:1,textTransform:"uppercase"}}>จำนวนเอกสาร</div></div>
            <div style={{padding:"10px 14px"}}>
              {[{lb:"📋 ใบเสนอราคา",val:`${allQts.length} ฉบับ`,c:C.qt},{lb:"📄 ใบแจ้งหนี้",val:`${allIvs.length} ฉบับ`,c:C.iv},{lb:"🧾 ใบเสร็จรับเงิน",val:`${allRcs.length} ฉบับ`,c:C.rc}].map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                  <span style={{color:C.muted}}>{s.lb}</span><span style={{fontWeight:700,color:s.c}}>{s.val}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,marginTop:4}}>
                <span style={{color:C.closed}}>🔄 กำลังดำเนินการ</span><span style={{fontWeight:700,color:C.closed}}>{activeQts} ฉบับ</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12}}>
                <span style={{color:C.closed}}>✔ เสร็จแล้ว</span><span style={{fontWeight:700,color:C.closed}}>{closedQts} ฉบับ</span>
              </div>
            </div>
          </div>
          {/* Col2: amounts */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{background:C.navy,padding:"9px 14px"}}><div style={{fontSize:11,fontWeight:800,color:C.gold,letterSpacing:1,textTransform:"uppercase"}}>ยอดเงินรวม</div></div>
            <div style={{padding:"10px 14px"}}>
              {[{lb:"📋 ยอดรวมใบเสนอราคา",val:`${fmt(totalQt)} ฿`,c:C.qt},{lb:"📄 ยอดรวมใบแจ้งหนี้",val:`${fmt(totalIv)} ฿`,c:C.iv}].map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                  <span style={{color:C.muted}}>{s.lb}</span><span style={{fontWeight:700,color:s.c}}>{s.val}</span>
                </div>
              ))}
              <div style={{marginTop:8,background:`${C.ok}0F`,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:C.ok,fontWeight:700}}>💰 รับชำระแล้ว</span>
                <span style={{fontSize:15,fontWeight:900,color:C.ok}}>{fmt(revenue)} ฿</span>
              </div>
            </div>
          </div>
          {/* Col3: pending */}
          <div style={{background:pendingCount>0?`${C.pending}07`:C.white,borderRadius:12,border:pendingCount>0?`1.5px solid ${C.pending}50`:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{background:pendingCount>0?C.pending:C.navy,padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#fff",letterSpacing:1,textTransform:"uppercase"}}>⏳ ยอดค้างชำระ</div>
              {pendingCount>0&&<button onClick={()=>setExpandPending(v=>!v)} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,padding:"2px 8px",cursor:"pointer"}}>{expandPending?"▲":"▼"}</button>}
            </div>
            <div style={{padding:"10px 14px"}}>
              {pendingCount===0?<div style={{textAlign:"center",padding:"12px 0",color:C.ok,fontWeight:700,fontSize:13}}>✅ ไม่มียอดค้างชำระ</div>:(
                <>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                    <span style={{fontSize:12,color:C.pending,fontWeight:700}}>{pendingCount} ใบแจ้งหนี้ค้าง</span>
                    <span style={{fontSize:18,fontWeight:900,color:C.pending}}>{fmt(pendingAmt)} ฿</span>
                  </div>
                  {expandPending&&pendingByQt.map(({qt,ivs,amt})=>(
                    <div key={qt.id} onClick={()=>onSelect(qt.id)} style={{marginBottom:8,borderRadius:8,border:`1px solid ${C.pending}30`,background:C.white,cursor:"pointer",overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:`${C.qt}0A`,borderBottom:`1px solid ${C.pending}20`}}>
                        <span style={{fontSize:11,fontWeight:800,color:C.qt}}>📋 {qt.docNumber}</span>
                        <span style={{fontSize:11,color:C.muted}}>{qt.client?.name||"—"}</span>
                      </div>
                      {ivs.map(iv=>{
                        const ivRcs=docs.filter(d=>d.type==="receipt"&&d.parentId===iv.id);
                        const ivRcvd=ivRcs.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
                        const ivTot=calcDoc(iv).total;
                        return (
                          <div key={iv.id} onClick={e=>{e.stopPropagation();onSelect(iv.id);}} style={{padding:"7px 10px 7px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                            <div style={{display:"flex",justifyContent:"space-between"}}>
                              <div><div style={{fontSize:11,fontWeight:700,color:C.iv}}>📄 {iv.docNumber}</div><div style={{fontSize:10,color:C.muted}}>{iv.date}{iv.dueDate?` · ครบ ${iv.dueDate}`:""}</div></div>
                              <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:800,color:C.iv}}>{fmt(ivTot)} ฿</div></div>
                            </div>
                            {ivRcs.length>0&&<div style={{display:"flex",gap:10,marginTop:3,fontSize:10}}><span style={{color:C.ok,fontWeight:700}}>✅ รับแล้ว {fmt(ivRcvd)} ฿</span><span style={{color:C.pending,fontWeight:700}}>⏳ ค้าง {fmt(ivTot-ivRcvd)} ฿</span></div>}
                          </div>
                        );
                      })}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"5px 10px",background:`${C.pending}08`}}>
                        <span style={{fontSize:10,color:C.pending,fontWeight:700}}>รวมค้างชำระ</span>
                        <span style={{fontSize:11,fontWeight:900,color:C.pending}}>{fmt(amt)} ฿</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setFilter("pending")} style={{marginTop:4,width:"100%",background:C.pending,border:"none",borderRadius:8,color:"#fff",padding:"7px 0",cursor:"pointer",fontSize:12,fontWeight:700}}>ดูรายการค้างชำระ →</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* QT tab + filter bar */}
        {(filter==="all"||filter==="quotation")&&(
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:12,color:C.muted,fontWeight:600}}>ใบเสนอราคา:</span>
            <div style={{display:"flex",background:C.white,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {[["active",`🔄 กำลังดำเนินการ${activeQts>0?` (${activeQts})`:""}`],["closed",`✔ เสร็จแล้ว${closedQts>0?` (${closedQts})`:""}`],["all","ทั้งหมด"]].map(([v,lb])=>(
                <button key={v} onClick={()=>setQtTab(v)} style={{border:"none",padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,
                  background:qtTab===v?(v==="closed"?C.closed:v==="all"?C.navy:C.qt):"transparent",
                  color:qtTab===v?"#fff":v==="closed"?C.closed:v==="all"?C.muted:C.qt}}>{lb}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <div style={{display:"flex",background:C.white,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {[["all","ทั้งหมด"],["quotation","ใบเสนอราคา"],["invoice","ใบแจ้งหนี้"],["receipt","ใบเสร็จ"],["pending","⏳ ค้างชำระ"]].map(([v,lb])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{border:"none",padding:"7px 11px",cursor:"pointer",fontSize:12,fontWeight:600,
                background:filter===v?(v==="pending"?C.pending:C.navy):"transparent",
                color:filter===v?"#fff":v==="pending"?C.pending:C.muted}}>
                {lb}{v==="pending"&&pendingCount>0&&filter!=="pending"?` (${pendingCount})`:""}
              </button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ค้นหา..." style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 14px",fontSize:13,outline:"none",background:C.white}}/>
        </div>

        {/* List */}
        {!hasAny?(
          <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
            <div style={{fontSize:52,marginBottom:12}}>📋</div>
            <div style={{fontWeight:700,fontSize:16,color:C.navy}}>เริ่มต้นด้วยการสร้างใบเสนอราคา</div>
            <div style={{fontSize:13,marginTop:6}}>Workflow: ใบเสนอราคา → ใบแจ้งหนี้ → ใบเสร็จรับเงิน</div>
          </div>
        ):filtered.length===0?(
          <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
            <div style={{fontSize:36}}>{filter==="pending"?"✅":"🔍"}</div>
            <div style={{fontWeight:600,marginTop:8}}>{filter==="pending"?"ไม่มียอดค้างชำระ 🎉":"ไม่พบเอกสาร"}</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {filtered.map(doc=>{
              const {total}=calcDoc(doc);
              const t=TYPE[doc.type];
              const childIvs=docs.filter(d=>d.type==="invoice"&&d.parentId===doc.id);
              const childRcs=docs.filter(d=>d.type==="receipt"&&d.parentId===doc.id);
              const pendingIvsQt=childIvs.filter(iv=>getIvStatus(iv)==="pending");
              const isPendingQt=doc.type==="quotation"&&getQtStatus(doc)==="pending"&&!doc.closed;
              const isPendingIv=doc.type==="invoice"&&getIvStatus(doc)==="pending";
              const isPending=isPendingQt||isPendingIv;
              const pendingDocAmt=isPendingIv?total:isPendingQt?pendingIvsQt.reduce((s,iv)=>s+calcDoc(iv).total,0):0;

              const ivInfo=doc.type==="quotation"?childIvs.map(iv=>{
                const rcs=docs.filter(d=>d.type==="receipt"&&d.parentId===iv.id);
                const rcvd=rcs.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
                const ivTot=calcDoc(iv).total;
                return {iv,cnt:rcs.length,rcvd,remain:ivTot-rcvd,ivTot,pend:getIvStatus(iv)==="pending",full:rcs.length>0&&ivTot-rcvd<=0};
              }):[];

              return (
                <div key={doc.id} style={{background:isPending?`${C.pending}05`:C.white,border:isPending?`1.5px solid ${C.pending}40`:`1px solid ${C.border}`,borderRadius:10,borderLeft:`4px solid ${isPending?C.pending:doc.type==="quotation"&&doc.closed?C.closed:t.color}`,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
                    <div onClick={()=>onSelect(doc.id)} style={{display:"flex",alignItems:"center",gap:10,flex:1,cursor:"pointer",minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:8,background:t.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:t.color,flexShrink:0}}>{t.short}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:13,color:C.navy}}>{doc.docNumber}</span>
                          <Chip type={doc.type} small/>
                          {isPending&&<span style={{fontSize:10,background:`${C.pending}18`,color:C.pending,border:`1px solid ${C.pending}50`,borderRadius:20,padding:"2px 7px",fontWeight:700}}>⏳ ค้างชำระ</span>}
                          {doc.type==="quotation"&&doc.closed&&<span style={{fontSize:10,background:`${C.closed}12`,color:C.closed,border:`1px solid ${C.closed}30`,borderRadius:20,padding:"2px 7px",fontWeight:700}}>✔ เสร็จแล้ว</span>}
                          {doc.type==="quotation"&&!doc.closed&&<span style={{fontSize:10,background:"#EFF6FF",color:C.iv,border:`1px solid ${C.iv}25`,borderRadius:20,padding:"2px 7px",fontWeight:600}}>🔄 ดำเนินการ</span>}
                          {doc.type==="receipt"&&doc.paid&&<span style={{fontSize:10,background:"#D1FAE5",color:C.ok,borderRadius:20,padding:"2px 7px",fontWeight:700}}>✅ ชำระแล้ว</span>}
                          {doc.type==="receipt"&&!doc.paid&&<span style={{fontSize:10,background:`${C.pending}18`,color:C.pending,borderRadius:20,padding:"2px 7px",fontWeight:700}}>⏳ ยังไม่ชำระ</span>}
                          {doc.type==="quotation"&&childIvs.length>0&&<span style={{fontSize:10,background:`${C.iv}12`,color:C.iv,borderRadius:20,padding:"1px 7px",fontWeight:600}}>📄 {childIvs.length} ใบแจ้งหนี้</span>}
                          {doc.type==="invoice"&&childRcs.length>0&&<span style={{fontSize:10,background:`${C.rc}12`,color:C.rc,borderRadius:20,padding:"1px 7px",fontWeight:600}}>🧾 {childRcs.length} ใบเสร็จ</span>}
                        </div>
                        <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                          {doc.client.name||"ยังไม่ระบุลูกค้า"} · {doc.date}
                          {doc.parentId&&<span style={{marginLeft:6,color:C.gold+"bb",fontSize:11}}>🔗 อ้างอิง</span>}
                        </div>
                        {isPending&&<div style={{fontSize:11,color:C.pending,fontWeight:700,marginTop:2}}>ยอดค้างชำระ: {fmt(pendingDocAmt)} ฿{isPendingQt&&pendingIvsQt.length>0?` (${pendingIvsQt.length} ใบแจ้งหนี้)`:""}</div>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,minWidth:74}}>
                      <div style={{fontWeight:800,fontSize:14,color:isPending?C.pending:doc.type==="quotation"&&doc.closed?C.closed:t.color}}>{fmt(total)}</div>
                      <div style={{fontSize:10,color:C.muted}}>บาท</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();onDelete(doc.id);}} style={{flexShrink:0,background:"#FEE2E2",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:C.danger,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                  </div>
                  {/* IV sub-rows under QT */}
                  {doc.type==="quotation"&&ivInfo.length>0&&(
                    <div style={{borderTop:`1px solid ${C.border}`,background:C.surface}}>
                      {ivInfo.map(({iv,cnt,rcvd,remain,ivTot,pend,full})=>(
                        <div key={iv.id} onClick={()=>onSelect(iv.id)} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:pend?`${C.pending}05`:full?`${C.ok}05`:C.surface}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px 6px 58px"}}>
                            <div style={{width:20,height:20,borderRadius:4,background:C.iv+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:C.iv,flexShrink:0}}>IV</div>
                            <div style={{flex:1,minWidth:0}}>
                              <span style={{fontSize:12,fontWeight:700,color:C.navy}}>{iv.docNumber}</span>
                              <span style={{fontSize:10,color:C.muted,marginLeft:8}}>{iv.date}</span>
                            </div>
                            <span style={{fontSize:11,background:`${C.rc}12`,color:C.rc,borderRadius:20,padding:"1px 6px",fontWeight:600}}>🧾 {cnt}</span>
                            {pend&&<span style={{fontSize:10,background:`${C.pending}15`,color:C.pending,border:`1px solid ${C.pending}40`,borderRadius:20,padding:"1px 6px",fontWeight:700}}>⏳ ค้าง</span>}
                            {full&&<span style={{fontSize:10,background:"#D1FAE5",color:C.ok,borderRadius:20,padding:"1px 6px",fontWeight:700}}>✅</span>}
                            <span style={{fontSize:12,fontWeight:700,color:pend?C.pending:full?C.ok:C.iv,minWidth:72,textAlign:"right"}}>{fmt(ivTot)} ฿</span>
                            <span style={{color:C.muted,fontSize:12}}>›</span>
                          </div>
                          {cnt>0&&(
                            <div style={{display:"flex",gap:12,padding:"3px 14px 5px 82px",fontSize:10}}>
                              <span style={{color:C.ok,fontWeight:600}}>✅ {fmt(rcvd)} ฿</span>
                              {remain>0&&<span style={{color:C.pending,fontWeight:600}}>⏳ ค้าง {fmt(remain)} ฿</span>}
                              {remain<=0&&<span style={{color:C.ok,fontWeight:600}}>ครบแล้ว</span>}
                            </div>
                          )}
                          {cnt>0&&ivTot>0&&<div style={{height:2,background:C.border,marginLeft:82,marginRight:14,marginBottom:4,borderRadius:1}}><div style={{height:"100%",borderRadius:1,width:`${Math.min(100,(rcvd/ivTot)*100)}%`,background:full?C.ok:C.pending}}/></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Analysis ───────────────────────────────────────────────────────────────
function AIAnalysis({docs,onBack}){
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const QUICK=["สรุปภาพรวมธุรกิจทั้งหมด","ใบแจ้งหนี้ค้างชำระมีเท่าไหร่","ลูกค้ารายไหนมียอดสูงสุด","วิเคราะห์แนวโน้มรายได้","รายการไหนขายดีที่สุด","สรุปยอดรับชำระและค้างชำระ"];

  const buildCtx=()=>{
    const allQts=docs.filter(d=>d.type==="quotation");
    const allIvs=docs.filter(d=>d.type==="invoice");
    const allRcs=docs.filter(d=>d.type==="receipt");
    const totalQt=allQts.reduce((s,d)=>s+calcDoc(d).total,0);
    const totalIv=allIvs.reduce((s,d)=>s+calcDoc(d).total,0);
    const revenue=allRcs.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
    const pending=allIvs.filter(iv=>!docs.some(d=>d.type==="receipt"&&d.parentId===iv.id)).reduce((s,iv)=>s+calcDoc(iv).total,0);
    const ivDetail=allIvs.map(iv=>{
      const rcs=docs.filter(d=>d.type==="receipt"&&d.parentId===iv.id);
      const rcvd=rcs.filter(r=>r.paid).reduce((s,r)=>s+calcDoc(r).total,0);
      return `  - ${iv.docNumber} (${iv.date}) ครบกำหนด:${iv.dueDate} ยอด:${calcDoc(iv).total.toFixed(2)} รับแล้ว:${rcvd.toFixed(2)} ค้าง:${(calcDoc(iv).total-rcvd).toFixed(2)}`;
    }).join("\n");
    const itemMap={};
    docs.forEach(doc=>(doc.items||[]).forEach(it=>{ if(!it.desc) return; if(!itemMap[it.desc]) itemMap[it.desc]={qty:0,rev:0}; const net=(it.qty||0)*(it.price||0)-Math.min(it.discount||0,(it.qty||0)*(it.price||0)); itemMap[it.desc].qty+=(it.qty||0); itemMap[it.desc].rev+=net; }));
    const top=Object.entries(itemMap).sort((a,b)=>b[1].rev-a[1].rev).slice(0,10).map(([n,{qty,rev}])=>`  - ${n}: จำนวน ${qty} ยอด ${rev.toFixed(2)} บาท`).join("\n");
    return `=== ข้อมูลธุรกิจ ===
ใบเสนอราคา: ${allQts.length} (${allQts.filter(d=>!d.closed).length} กำลังดำเนิน, ${allQts.filter(d=>d.closed).length} เสร็จแล้ว) รวม ${totalQt.toFixed(2)} บาท
ใบแจ้งหนี้: ${allIvs.length} รวม ${totalIv.toFixed(2)} บาท
ใบเสร็จ: ${allRcs.length} รับชำระแล้ว: ${revenue.toFixed(2)} บาท ค้างชำระ: ${pending.toFixed(2)} บาท

[ใบแจ้งหนี้รายละเอียด]
${allIvs.length>0?ivDetail:"(ไม่มีข้อมูล)"}

[สินค้า/บริการยอดขาย Top 10]
${top||"(ไม่มีข้อมูล)"}`;
  };

  const send=async(text)=>{
    const t=text||input.trim(); if(!t||loading) return;
    setInput("");
    const newMsgs=[...messages,{role:"user",content:t}];
    setMessages(newMsgs); setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-6",max_tokens:1000,
        system:`คุณเป็นผู้ช่วยวิเคราะห์ธุรกิจ ตอบเป็นภาษาไทย กระชับ ชัดเจน\n\nข้อมูลธุรกิจ:\n${buildCtx()}`,
        messages:newMsgs.map(m=>({role:m.role,content:m.content})),
      })});
      const data=await res.json();
      const reply=data.content?.find(b=>b.type==="text")?.text||"ไม่สามารถวิเคราะห์ได้";
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    }catch{setMessages(p=>[...p,{role:"assistant",content:"❌ เกิดข้อผิดพลาด กรุณาลองใหม่"}]);}
    setLoading(false);
  };

  return (
    <div style={{background:C.surface,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.navy,padding:"0 24px",flexShrink:0}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#fff",fontSize:20}}>←</button>
            <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
            <div><div style={{color:"#fff",fontWeight:800,fontSize:15}}>AI วิเคราะห์ธุรกิจ</div><div style={{color:C.gold+"99",fontSize:11}}>ถามเกี่ยวกับข้อมูลเอกสารทั้งหมด</div></div>
          </div>
          {messages.length>0&&<button onClick={()=>setMessages([])} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,color:"#fff",padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>🗑️ ล้าง</button>}
        </div>
      </div>
      <div style={{maxWidth:820,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column",padding:"16px 24px",gap:12}}>
        {/* Snapshot */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {(()=>{
            const qts=docs.filter(d=>d.type==="quotation").length;
            const ivs=docs.filter(d=>d.type==="invoice").length;
            const rcs=docs.filter(d=>d.type==="receipt").length;
            const rcvd=docs.filter(d=>d.type==="receipt"&&d.paid).reduce((s,d)=>s+calcDoc(d).total,0);
            const pend=docs.filter(d=>d.type==="invoice").filter(iv=>!docs.some(d=>d.type==="receipt"&&d.parentId===iv.id)).reduce((s,iv)=>s+calcDoc(iv).total,0);
            return [{lb:"ใบเสนอราคา",val:qts+" ฉบับ",c:C.qt,i:"📋"},{lb:"ใบแจ้งหนี้",val:ivs+" ฉบับ",c:C.iv,i:"📄"},{lb:"ใบเสร็จ",val:rcs+" ฉบับ",c:C.rc,i:"🧾"},{lb:"รับแล้ว",val:fmt(rcvd)+" ฿",c:C.ok,i:"✅"},{lb:"ค้างชำระ",val:fmt(pend)+" ฿",c:C.pending,i:"⏳"}];
          })().map(s=>(
            <div key={s.lb} style={{background:C.white,borderRadius:10,padding:"10px 8px",border:`1px solid ${C.border}`,borderTop:`2px solid ${s.c}`,textAlign:"center"}}>
              <div style={{fontSize:16}}>{s.i}</div>
              <div style={{fontSize:12,fontWeight:800,color:s.c,marginTop:2}}>{s.val}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:1,fontWeight:600}}>{s.lb}</div>
            </div>
          ))}
        </div>
        {/* Chat */}
        <div style={{flex:1,background:C.white,borderRadius:14,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:320}}>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {messages.length===0&&(
              <div style={{textAlign:"center",padding:"28px 0",color:C.muted}}>
                <div style={{fontSize:36,marginBottom:8}}>🤖</div>
                <div style={{fontWeight:700,fontSize:14,color:C.navy}}>วิเคราะห์ข้อมูลธุรกิจด้วย AI</div>
                <div style={{fontSize:12,marginTop:5}}>ถามได้เลยเกี่ยวกับเอกสาร ยอดเงิน หรือแนวโน้มธุรกิจ</div>
                {docs.length===0&&<div style={{marginTop:12,padding:"8px 14px",background:`${C.pending}10`,borderRadius:8,display:"inline-block",fontSize:12,color:C.pending,fontWeight:600}}>⚠️ ยังไม่มีข้อมูลเอกสาร</div>}
              </div>
            )}
            {messages.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
                {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div>}
                <div style={{maxWidth:"75%",background:m.role==="user"?C.navy:C.surface,color:m.role==="user"?"#fff":C.text,borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"9px 13px",fontSize:13,lineHeight:1.6,border:m.role==="assistant"?`1px solid ${C.border}`:"none",whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>
            ))}
            {loading&&<div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"14px 14px 14px 4px",padding:"9px 14px",display:"flex",gap:4}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.muted,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>)}
              </div>
            </div>}
            <div ref={el=>el?.scrollIntoView({behavior:"smooth"})}/>
          </div>
          {messages.length===0&&(
            <div style={{padding:"0 14px 10px",display:"flex",gap:6,flexWrap:"wrap"}}>
              {QUICK.map(q=><button key={q} onClick={()=>send(q)} style={{background:C.tag,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 11px",fontSize:12,color:C.navy,cursor:"pointer",fontWeight:600}}>{q}</button>)}
            </div>
          )}
          <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="ถามเกี่ยวกับข้อมูลธุรกิจ... (Enter ส่ง)" style={{flex:1,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none",background:C.surface,fontFamily:"inherit"}}/>
            <button onClick={()=>send()} disabled={!input.trim()||loading} style={{background:input.trim()&&!loading?"linear-gradient(135deg,#7C3AED,#4F46E5)":C.border,border:"none",borderRadius:10,color:"#fff",padding:"9px 16px",cursor:input.trim()&&!loading?"pointer":"default",fontSize:13,fontWeight:700}}>{loading?"⏳":"ส่ง →"}</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

// ── AppCore: UI wired to external Supabase handlers ──────────────────────────
export default function AppCore({ docs, onSaveDoc, onDeleteDoc, onToggleClosed }) {
  const [view, setView]         = useState('list')
  const [editing, setEditing]   = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [prevView, setPrevView] = useState(null)
  const [toast, setToast]       = useState(null)
  const [delId, setDelId]       = useState(null)
  const [saving, setSaving]     = useState(false)

  const toast2 = (msg, color) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2800) }

  const goTo = (v, extra = {}) => {
    if (v === 'form')    { setEditing(extra.doc); setPrevView(extra.prev || 'list') }
    if (v === 'preview') setViewingId(extra.id)
    setView(v)
  }

  const handleCreate = (type, parent = null) =>
    goTo('form', { doc: newDoc(type, parent), prev: parent ? 'preview' : 'list' })

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSaveDoc(editing)
    setSaving(false)
    if (ok) {
      toast2('✅ บันทึกเอกสารสำเร็จ')
      setViewingId(editing.id)
      setEditing(null)
      setView('preview')
    }
  }

  const handleEdit = () => goTo('form', { doc: docs.find(d => d.id === viewingId), prev: 'preview' })

  const handleToggleClosed = async (id) => {
    const doc = docs.find(d => d.id === id)
    await onToggleClosed(id)
    toast2(doc?.closed ? '🔄 เปิดงานอีกครั้ง' : '✔ ปิดงานเสร็จแล้ว', doc?.closed ? C.iv : C.ok)
  }

  const execDelete = async (targetId, mode) => {
    const count = await onDeleteDoc(targetId, mode, docs)
    if (count > 0) {
      toast2(`🗑️ ลบแล้ว ${count} ฉบับ`, C.danger)
      setDelId(null)
      if (String(viewingId) === String(targetId) || mode === 'chain') {
        setView('list')
        setViewingId(null)
      }
    }
  }

  const handleCancel = () => {
    setEditing(null)
    if (prevView === 'preview' && viewingId) setView('preview')
    else setView('list')
  }

  const viewingDoc = docs.find(d => String(d.id) === String(viewingId))
  const modalDoc   = delId ? docs.find(d => String(d.id) === String(delId)) : null

  return (
    <div style={{ fontFamily: "\'Sarabun\',\'Noto Sans Thai\',system-ui,sans-serif", position: 'relative' }}>
      {toast && <Toast msg={toast.msg} color={toast.color} />}
      {saving && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: C.navy, color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700 }}>
          ⏳ กำลังบันทึก...
        </div>
      )}
      {modalDoc && (
        <DeleteModal
          doc={modalDoc} docs={docs}
          onConfirm={mode => execDelete(modalDoc.id, mode)}
          onCancel={() => setDelId(null)}
        />
      )}
      {view === 'list' && (
        <Dashboard
          docs={docs}
          onCreate={handleCreate}
          onSelect={id => goTo('preview', { id })}
          onDelete={id => setDelId(id)}
          onAI={() => setView('ai')}
        />
      )}
      {view === 'form' && editing && (
        <DocForm doc={editing} onChange={setEditing} onSave={handleSave} onCancel={handleCancel} />
      )}
      {view === 'preview' && viewingDoc && (
        <DocPreview
          doc={viewingDoc} docs={docs}
          onEdit={handleEdit}
          onDelete={id => setDelId(id)}
          onBack={() => setView('list')}
          onCreateChild={(type, parent) => handleCreate(type, parent)}
          onSelect={id => goTo('preview', { id })}
          onToggleClosed={handleToggleClosed}
        />
      )}
      {view === 'ai' && <AIAnalysis docs={docs} onBack={() => setView('list')} />}
    </div>
  )
}
