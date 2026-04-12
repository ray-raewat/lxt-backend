"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://lxt-backend.onrender.com";

const WORK_TYPES = ["Pipe Jacking","HDD (Horizontal Directional Drilling)","Open Trench",
  "Cable Pulling","Jointing / Splicing","Testing & Commissioning",
  "Survey / Setting Out","Backfilling & Reinstatement","Manhole","Others"];

const ROLES = ["admin","user","viewer"];
const ROLE_COLOR = { admin:"#dc2626", user:"#1d4ed8", viewer:"#059669" };
const COLORS = ["#1d4ed8","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#65a30d","#ea580c","#0284c7"];
const TODAY = new Date().toISOString().split("T")[0];

/* ── Shared styles ── */
const S = {
  input: { padding:"10px 12px",width:"100%",borderRadius:6,border:"1px solid #d1d5db",background:"white",color:"#111",fontSize:14,boxSizing:"border-box",marginTop:4,marginBottom:14 },
  label: { fontWeight:600,fontSize:13,color:"#374151",display:"block" },
  card:  { background:"white",borderRadius:10,boxShadow:"0 2px 8px rgba(0,0,0,.08)",padding:18,marginBottom:14 },
  btn:   (color="#1d4ed8",full=false) => ({ padding:full?"13px 0":"8px 16px",width:full?"100%":"auto",background:color,color:"white",border:"none",borderRadius:6,fontSize:full?15:13,fontWeight:700,cursor:"pointer" }),
};

/* ── Image compression ── */
async function compress(file, maxW=1200, q=0.75) {
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      let {width:w,height:h} = img;
      if (w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      const c = document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      c.toBlob(res,"image/jpeg",q);
    };
    img.src=url;
  });
}

/* ── API call helper ── */
function useApi(token) {
  const call = useCallback(async (path, opts={}) => {
    const headers = { Authorization: `Bearer ${token}`, ...(opts.headers||{}) };
    if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const r = await fetch(`${API}${path}`, { ...opts, headers });
    return r;
  }, [token]);
  return call;
}

/* ── ImageUploader ── */
function ImageUploader({ label, category, images, setImages, token }) {
  const camRef = useRef(), galRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handle = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const slots = 5 - images.length;
      const urls = await Promise.all(Array.from(files).slice(0,slots).map(async f => {
        const blob = await compress(f);
        const fd = new FormData();
        fd.append("file", blob, "photo.jpg");
        fd.append("category", category);
        const r = await fetch(`${API}/upload-image`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:fd });
        const d = await r.json();
        if (!d.url) throw new Error(d.error||"Upload failed");
        return d.url;
      }));
      setImages(p => [...p, ...urls]);
    } catch(e) { alert("❌ Upload error: "+e.message); }
    setUploading(false);
  };

  const remove = i => setImages(p => p.filter((_,j)=>j!==i));

  return (
    <div style={{marginBottom:16}}>
      <label style={{...S.label,marginBottom:8}}>{label}</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-start"}}>
        {images.map((url,i)=>(
          <div key={i} style={{position:"relative",width:88,height:88}}>
            <img src={url} alt="" style={{width:88,height:88,objectFit:"cover",borderRadius:6,border:"1px solid #d1d5db"}}/>
            <button onClick={()=>remove(i)} style={{position:"absolute",top:-7,right:-7,width:22,height:22,borderRadius:"50%",background:"#ef4444",color:"white",border:"none",cursor:"pointer",fontSize:13,lineHeight:"22px",padding:0}}>×</button>
          </div>
        ))}
        {images.length<5 && (
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <button onClick={()=>camRef.current.click()} disabled={uploading}
              style={{width:88,height:40,borderRadius:6,border:"2px dashed #93c5fd",background:"#eff6ff",cursor:uploading?"wait":"pointer",color:"#1d4ed8",fontSize:12,fontWeight:700}}>
              {uploading?"⏳":"📷 Camera"}
            </button>
            <button onClick={()=>galRef.current.click()} disabled={uploading}
              style={{width:88,height:40,borderRadius:6,border:"2px dashed #d1d5db",background:"#f9fafb",cursor:uploading?"wait":"pointer",color:"#374151",fontSize:12,fontWeight:700}}>
              🖼️ Gallery
            </button>
          </div>
        )}
      </div>
      {/* Camera – opens camera on mobile */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handle(e.target.files)} />
      {/* Gallery – opens photo picker (multiple) */}
      <input ref={galRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handle(e.target.files)} />
      <p style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Max 5 · Auto-compressed · Camera or Gallery</p>
    </div>
  );
}

/* ── Login Screen ── */
function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ username:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const login = async e => {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const r = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) { setErr(d.detail||"Login failed"); setLoading(false); return; }
      onLogin(d);
    } catch(e) { setErr("Connection error: "+e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Segoe UI,Arial,sans-serif"}}>
      <div style={{background:"white",borderRadius:14,boxShadow:"0 10px 40px rgba(0,0,0,.25)",padding:"36px 32px",width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:8}}>📋</div>
          <h1 style={{fontSize:20,fontWeight:800,color:"#1e3a5f",margin:0}}>LXT Daily Report</h1>
          <p style={{fontSize:13,color:"#6b7280",margin:"6px 0 0"}}>LXT Network Co., Ltd.</p>
        </div>
        <form onSubmit={login}>
          <label style={S.label}>Username</label>
          <input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="Enter username" style={S.input} autoComplete="username" />
          <label style={S.label}>Password</label>
          <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Enter password" style={S.input} autoComplete="current-password" />
          {err && <p style={{color:"#ef4444",fontSize:13,marginBottom:12,background:"#fef2f2",padding:"8px 12px",borderRadius:6}}>❌ {err}</p>}
          <button type="submit" disabled={loading} style={{...S.btn("#1d4ed8",true),opacity:loading?.6:1}}>
            {loading?"⏳ Logging in...":"🔐 Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Submit Tab ── */
function SubmitTab({ token }) {
  const api = useApi(token);
  const [form, setForm] = useState({ date:TODAY,project:"",site:"",gps:"",workTypes:[],description:"",quantity:"",issues:"" });
  const [teamImages,    setTeamImages]    = useState([]);
  const [equipImages,   setEquipImages]   = useState([]);
  const [materialImages,setMaterialImages]= useState([]);
  const [areaImages,    setAreaImages]    = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleWT = wt => set("workTypes", form.workTypes.includes(wt)?form.workTypes.filter(x=>x!==wt):[...form.workTypes,wt]);

  const submit = async () => {
    if (!form.project||!form.site||!form.description||form.workTypes.length===0) { alert("กรุณากรอกข้อมูลให้ครบ"); return; }
    setLoading(true);
    try {
      const r = await api("/reports",{method:"POST",body:JSON.stringify({...form,teamImages,equipmentImages:equipImages,materialImages,areaImages})});
      if (r.ok) {
        alert("✅ ส่งรายงานสำเร็จ");
        setForm({date:TODAY,project:"",site:"",gps:"",workTypes:[],description:"",quantity:"",issues:""});
        setTeamImages([]); setEquipImages([]); setMaterialImages([]); setAreaImages([]);
      } else alert("❌ ส่งไม่สำเร็จ");
    } catch(e) { alert("❌ "+e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}><label style={S.label}>📅 Date</label><input type="date" value={form.date} style={S.input} onChange={e=>set("date",e.target.value)}/></div>
        <div style={{flex:2}}><label style={S.label}>🏗️ Project *</label><input value={form.project} placeholder="โครงการ..." style={S.input} onChange={e=>set("project",e.target.value)}/></div>
      </div>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}><label style={S.label}>📍 Site *</label><input value={form.site} placeholder="Site A" style={S.input} onChange={e=>set("site",e.target.value)}/></div>
        <div style={{flex:1}}><label style={S.label}>🌐 GPS</label><input value={form.gps} placeholder="13.75, 100.50" style={S.input} onChange={e=>set("gps",e.target.value)}/></div>
      </div>
      <label style={{...S.label,marginBottom:8}}>🔧 Work Type *</label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14,padding:12,border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb"}}>
        {WORK_TYPES.map(wt=>(
          <label key={wt} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#111"}}>
            <input type="checkbox" checked={form.workTypes.includes(wt)} onChange={()=>toggleWT(wt)} style={{width:16,height:16,cursor:"pointer"}}/>{wt}
          </label>
        ))}
      </div>
      <label style={S.label}>📝 Description *</label>
      <textarea value={form.description} placeholder="รายละเอียดงานที่ทำวันนี้..." style={{...S.input,height:90,resize:"vertical"}} onChange={e=>set("description",e.target.value)}/>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}><label style={S.label}>📏 Quantity</label><input value={form.quantity} placeholder="25m / 3 joints" style={S.input} onChange={e=>set("quantity",e.target.value)}/></div>
        <div style={{flex:2}}><label style={S.label}>⚠️ Issues</label><input value={form.issues} placeholder="ปัญหา / ข้อสังเกต" style={S.input} onChange={e=>set("issues",e.target.value)}/></div>
      </div>
      <div style={{borderTop:"2px solid #e5e7eb",paddingTop:16,marginTop:4}}>
        <p style={{fontWeight:700,color:"#1e3a5f",marginBottom:14,fontSize:14}}>📷 Photos — Auto-compressed</p>
        <ImageUploader label="👷 Working Team"              category="team"     images={teamImages}     setImages={setTeamImages}     token={token}/>
        <ImageUploader label="🔧 Tools & Machines"          category="equip"    images={equipImages}    setImages={setEquipImages}    token={token}/>
        <ImageUploader label="📦 Materials"                 category="material" images={materialImages} setImages={setMaterialImages} token={token}/>
        <ImageUploader label="📍 Work Area (Before & After)"category="area"     images={areaImages}     setImages={setAreaImages}     token={token}/>
      </div>
      <button onClick={submit} disabled={loading} style={{...S.btn(loading?"#9ca3af":"#1d4ed8",true),marginTop:8,cursor:loading?"not-allowed":"pointer"}}>
        {loading?"⏳ กำลังส่ง...":"🚀 Submit Daily Report"}
      </button>
    </div>
  );
}

/* ── Dashboard Tab ── */
function DashboardTab({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = useApi(token);

  useEffect(()=>{
    api("/stats").then(r=>r.json()).then(d=>{setStats(d);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  if (loading) return <p style={{textAlign:"center",padding:40,color:"#6b7280"}}>⏳ กำลังโหลด...</p>;
  if (!stats)  return <p style={{textAlign:"center",padding:40,color:"#ef4444"}}>❌ โหลดไม่สำเร็จ</p>;
  const maxWT=Math.max(1,...stats.by_work_type.map(x=>x.count));
  const maxP =Math.max(1,...stats.by_project.map(x=>x.count));
  const maxD =Math.max(1,...stats.daily.map(x=>x.count));

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[{l:"Total",v:stats.total,c:"#1d4ed8",i:"📋"},{l:"Today",v:stats.today,c:"#059669",i:"📅"},{l:"This Week",v:stats.this_week,c:"#d97706",i:"📆"},{l:"This Month",v:stats.this_month,c:"#7c3aed",i:"🗓️"}].map(x=>(
          <div key={x.l} style={{background:"white",borderRadius:10,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.08)",borderLeft:`4px solid ${x.c}`}}>
            <div style={{fontSize:11,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{x.i} {x.l}</div>
            <div style={{fontSize:30,fontWeight:800,color:x.c,marginTop:4}}>{x.v}</div>
          </div>
        ))}
      </div>

      {stats.by_work_type.length>0&&<div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#374151"}}>🔧 Work Type Breakdown</h3>
        {stats.by_work_type.map((w,i)=>(
          <div key={w.name} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#374151",marginBottom:3}}><span>{w.name}</span><b>{w.count}</b></div>
            <div style={{background:"#f3f4f6",borderRadius:4,height:10,overflow:"hidden"}}>
              <div style={{width:`${(w.count/maxWT)*100}%`,background:COLORS[i%COLORS.length],height:"100%",borderRadius:4}}/>
            </div>
          </div>
        ))}
      </div>}

      {stats.daily.length>0&&<div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#374151"}}>📈 Daily Activity (Last 30 Days)</h3>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80,overflowX:"auto",paddingBottom:4}}>
          {stats.daily.map(d=>(
            <div key={d.date} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:22,flex:1}}>
              <div title={`${d.date}: ${d.count}`} style={{width:"100%",background:"#1d4ed8",borderRadius:"3px 3px 0 0",height:`${(d.count/maxD)*70}px`,minHeight:4}}/>
              <div style={{fontSize:8,color:"#9ca3af",marginTop:2,transform:"rotate(-45deg)",whiteSpace:"nowrap"}}>{d.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>}

      {stats.by_project.length>0&&<div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#374151"}}>🏗️ By Project</h3>
        {stats.by_project.map((p,i)=>(
          <div key={p.project} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#374151",marginBottom:3}}><span>{p.project||"(unnamed)"}</span><b>{p.count}</b></div>
            <div style={{background:"#f3f4f6",borderRadius:4,height:10,overflow:"hidden"}}>
              <div style={{width:`${(p.count/maxP)*100}%`,background:COLORS[(i+3)%COLORS.length],height:"100%",borderRadius:4}}/>
            </div>
          </div>
        ))}
      </div>}

      {stats.by_site.length>0&&<div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#374151"}}>📍 By Site</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {stats.by_site.map((s,i)=>(
            <span key={s.site} style={{background:COLORS[i%COLORS.length],color:"white",borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600}}>
              {s.site||"(unnamed)"} ({s.count})
            </span>
          ))}
        </div>
      </div>}

      {stats.total===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}><p style={{fontSize:32}}>📊</p><p>ยังไม่มีข้อมูล</p></div>}
    </div>
  );
}

/* ── Reports Tab ── */
function ReportsTab({ token, role }) {
  const api = useApi(token);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r=await api("/reports"); const d=await r.json(); setReports(d.data||[]); } catch(e){alert("❌ "+e.message);}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const del = async (id) => {
    if (!confirm("Delete this report?")) return;
    await api(`/reports/${id}`,{method:"DELETE"});
    setReports(p=>p.filter(r=>r.id!==id));
  };

  const totalPics = r => (r.teamImages?.length||0)+(r.equipmentImages?.length||0)+(r.materialImages?.length||0)+(r.areaImages?.length||0);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:700,fontSize:15,color:"#374151"}}>{reports.length} รายการ</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={load} style={S.btn("#6b7280")}>🔄 Refresh</button>
          <button onClick={()=>window.open(`${API}/export?token=${encodeURIComponent(token)}`,"_blank")} disabled={!reports.length}
            style={{...S.btn(reports.length?"#16a34a":"#d1d5db"),cursor:reports.length?"pointer":"not-allowed"}}>📥 Excel</button>
        </div>
      </div>
      {loading&&<p style={{textAlign:"center",color:"#6b7280",padding:20}}>⏳ กำลังโหลด...</p>}
      {!loading&&!reports.length&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}><p style={{fontSize:32}}>📋</p><p>ยังไม่มีรายงาน</p></div>}
      {reports.map(r=>(
        <div key={r.id} style={{border:"1px solid #e5e7eb",borderRadius:8,marginBottom:10,background:"white",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",cursor:"pointer"}} onClick={()=>setExpanded(expanded===r.id?null:r.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:15,color:"#1d4ed8"}}>{r.project||"-"}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {totalPics(r)>0&&<span style={{fontSize:11,background:"#dbeafe",color:"#1d4ed8",padding:"2px 7px",borderRadius:20,fontWeight:600}}>📷{totalPics(r)}</span>}
                <span style={{fontSize:12,color:"#6b7280",background:"#f3f4f6",padding:"2px 8px",borderRadius:20}}>{r.date}</span>
                <span style={{fontSize:12,color:"#9ca3af"}}>{expanded===r.id?"▲":"▼"}</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 16px",fontSize:13,color:"#374151",marginTop:6}}>
              <span>📍 {r.site||"-"}</span><span>🔧 {(r.workTypes||[]).join(", ")||"-"}</span>
            </div>
          </div>
          {expanded===r.id&&(
            <div style={{borderTop:"1px solid #f3f4f6",padding:"12px 14px",background:"#fafafa"}}>
              <p style={{margin:"0 0 8px",fontSize:13}}>📝 {r.description||"-"}</p>
              <div style={{display:"flex",gap:16,fontSize:13,marginBottom:10}}>
                <span>📏 {r.quantity||"-"}</span>
                {r.issues&&r.issues!=="None"&&<span style={{color:"#b45309"}}>⚠️ {r.issues}</span>}
              </div>
              {[["👷 Team",r.teamImages],["🔧 Tools",r.equipmentImages],["📦 Materials",r.materialImages],["📍 Area",r.areaImages]].map(([lbl,imgs])=>
                imgs?.length>0&&(
                  <div key={lbl} style={{marginBottom:10}}>
                    <p style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>{lbl}</p>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {imgs.map((url,i)=><img key={i} src={url} alt="" style={{width:80,height:80,objectFit:"cover",borderRadius:5,border:"1px solid #e5e7eb"}}/>)}
                    </div>
                  </div>
                )
              )}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button onClick={()=>window.open(`${API}/report/${r.id}`,"_blank")} style={S.btn()}>📄 Full Report</button>
                {role==="admin"&&<button onClick={()=>del(r.id)} style={S.btn("#ef4444")}>🗑️ Delete</button>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Admin Tab ── */
function AdminTab({ token }) {
  const api = useApi(token);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username:"",password:"",full_name:"",role:"user" });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => { const r=await api("/users"); setUsers(await r.json()); };
  useEffect(()=>{load();},[]);

  const save = async () => {
    if (!form.username) { alert("Username required"); return; }
    if (editing) {
      await api(`/users/${editing}`,{method:"PUT",body:JSON.stringify(form)});
    } else {
      if (!form.password) { alert("Password required"); return; }
      await api("/users",{method:"POST",body:JSON.stringify(form)});
    }
    setForm({username:"",password:"",full_name:"",role:"user"}); setEditing(null); setShowForm(false); load();
  };

  const del = async id => {
    if (!confirm("Delete this user?")) return;
    await api(`/users/${id}`,{method:"DELETE"}); load();
  };

  const toggleActive = async (u) => {
    await api(`/users/${u.id}`,{method:"PUT",body:JSON.stringify({active:!u.active})}); load();
  };

  const startEdit = u => {
    setForm({username:u.username,password:"",full_name:u.full_name||"",role:u.role,active:u.active});
    setEditing(u.id); setShowForm(true);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700,color:"#374151"}}>👥 User Management</h3>
        <button onClick={()=>{setForm({username:"",password:"",full_name:"",role:"user"});setEditing(null);setShowForm(true);}} style={S.btn()}>+ Add User</button>
      </div>

      {showForm&&(
        <div style={{...S.card,border:"2px solid #1d4ed8",marginBottom:16}}>
          <h4 style={{margin:"0 0 14px",color:"#1e3a5f"}}>{editing?"✏️ Edit User":"➕ New User"}</h4>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={S.label}>Full Name</label><input value={form.full_name} style={S.input} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="John Doe"/></div>
            <div><label style={S.label}>Username *</label><input value={form.username} style={S.input} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="john.doe"/></div>
            <div><label style={S.label}>{editing?"New Password (blank=keep)":"Password *"}</label><input type="password" value={form.password} style={S.input} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••"/></div>
            <div><label style={S.label}>Role</label>
              <select value={form.role} style={S.input} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={save} style={S.btn("#059669")}>💾 Save</button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={S.btn("#6b7280")}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{...S.card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#1e3a5f",color:"white"}}>
              {["Full Name","Username","Role","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,fontSize:12}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u,i)=>(
              <tr key={u.id} style={{background:i%2===0?"white":"#f9fafb",borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"10px 14px",fontWeight:600}}>{u.full_name||"-"}</td>
                <td style={{padding:"10px 14px",color:"#374151"}}>{u.username}</td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{background:ROLE_COLOR[u.role]||"#6b7280",color:"white",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>
                    {u.role}
                  </span>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <button onClick={()=>toggleActive(u)}
                    style={{background:u.active?"#d1fae5":"#fee2e2",color:u.active?"#059669":"#ef4444",border:"none",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {u.active?"✅ Active":"❌ Inactive"}
                  </button>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>startEdit(u)} style={{...S.btn("#d97706"),padding:"5px 10px",fontSize:12}}>✏️ Edit</button>
                    <button onClick={()=>del(u.id)} style={{...S.btn("#ef4444"),padding:"5px 10px",fontSize:12}}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length&&<p style={{textAlign:"center",padding:20,color:"#9ca3af"}}>No users found</p>}
      </div>

      <div style={{...S.card,background:"#fffbeb",border:"1px solid #fde68a",marginTop:4}}>
        <p style={{fontSize:13,color:"#92400e",fontWeight:600,margin:"0 0 6px"}}>📋 Access Levels</p>
        <p style={{fontSize:12,color:"#78350f",margin:0,lineHeight:1.7}}>
          🔴 <b>Admin</b> — Full access: submit, view, delete reports, manage users<br/>
          🔵 <b>User</b> — Can submit and view reports<br/>
          🟢 <b>Viewer</b> — Read-only: view reports and export only
        </p>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function Home() {
  const [auth, setAuth] = useState(()=>{
    try { const s=localStorage.getItem("lxt_auth"); return s?JSON.parse(s):null; } catch{return null;}
  });
  const [tab, setTab] = useState("submit");

  const handleLogin = (data) => {
    localStorage.setItem("lxt_auth", JSON.stringify(data));
    setAuth(data);
  };

  const logout = () => {
    localStorage.removeItem("lxt_auth");
    setAuth(null); setTab("submit");
  };

  if (!auth) return <LoginScreen onLogin={handleLogin}/>;

  const tabs = [
    {id:"submit",    label:"✏️ Submit"},
    {id:"dashboard", label:"📊 Dashboard"},
    {id:"view",      label:"📋 Reports"},
    ...(auth.role==="admin"?[{id:"admin",label:"⚙️ Admin"}]:[]),
  ];

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",padding:"20px 16px",fontFamily:"Segoe UI,Arial,sans-serif"}}>
      <div style={{maxWidth:640,margin:"auto",background:"white",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,.10)",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",padding:"16px 24px",color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h1 style={{margin:0,fontSize:18,fontWeight:800}}>📋 LXT Daily Progress Report</h1>
            <p style={{margin:"2px 0 0",fontSize:12,opacity:.85}}>LXT Network Co., Ltd.</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:12,opacity:.9}}>👤 {auth.full_name||auth.username}</p>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
              <span style={{background:ROLE_COLOR[auth.role]||"#6b7280",color:"white",padding:"1px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>{auth.role}</span>
              <button onClick={logout} style={{background:"rgba(255,255,255,.2)",color:"white",border:"none",padding:"3px 10px",borderRadius:20,fontSize:11,cursor:"pointer",fontWeight:600}}>Logout</button>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,padding:"12px 24px 0",overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"9px 0",minWidth:0,flex:1,background:tab===t.id?"#1d4ed8":"#f3f4f6",color:tab===t.id?"white":"#374151",border:"none",fontWeight:700,fontSize:13,cursor:"pointer",borderRadius:6,whiteSpace:"nowrap",paddingLeft:6,paddingRight:6}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{padding:"20px 24px 24px"}}>
          {tab==="submit"    && <SubmitTab    token={auth.token}/>}
          {tab==="dashboard" && <DashboardTab token={auth.token}/>}
          {tab==="view"      && <ReportsTab   token={auth.token} role={auth.role}/>}
          {tab==="admin"     && <AdminTab     token={auth.token}/>}
        </div>
      </div>
    </div>
  );
}
