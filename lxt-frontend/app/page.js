"use client";
import { useState, useEffect, useRef } from "react";

const API = "https://lxt-backend.onrender.com";

const WORK_TYPE_OPTIONS = [
  "Pipe Jacking", "HDD (Horizontal Directional Drilling)", "Open Trench",
  "Cable Pulling", "Jointing / Splicing", "Testing & Commissioning",
  "Survey / Setting Out", "Backfilling & Reinstatement", "Manhole", "Others",
];

const TODAY = new Date().toISOString().split("T")[0];
const COLORS = ["#1d4ed8","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#65a30d","#ea580c","#0284c7"];

const card = { background:"white", borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", padding:18, marginBottom:14 };
const inputStyle = { padding:"10px 12px", width:"100%", borderRadius:6, border:"1px solid #d1d5db", background:"white", color:"#111", fontSize:14, boxSizing:"border-box", marginTop:4, marginBottom:14 };
const labelStyle = { fontWeight:600, fontSize:13, color:"#374151", display:"block" };

/* ─── Image compression ─── */
async function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, "image/jpeg", quality);
    };
    img.src = url;
  });
}

/* ─── Upload one image to backend ─── */
async function uploadImage(file, category) {
  const blob = await compressImage(file);
  const fd = new FormData();
  fd.append("file", blob, "photo.jpg");
  fd.append("category", category);
  const res = await fetch(`${API}/upload-image`, { method: "POST", body: fd });
  const data = await res.json();
  if (data.url) return data.url;
  throw new Error(data.error || "Upload failed");
}

/* ─── ImageUploader component ─── */
function ImageUploader({ label, category, images, setImages }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).slice(0, 5 - images.length).map(f => uploadImage(f, category)));
      setImages(prev => [...prev, ...urls]);
    } catch (e) {
      alert("❌ Upload failed: " + e.message);
    }
    setUploading(false);
  };

  const remove = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ ...labelStyle, marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: "relative", width: 90, height: 90 }}>
            <img src={url} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid #d1d5db" }} />
            <button onClick={() => remove(i)} style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", background:"#ef4444", color:"white", border:"none", cursor:"pointer", fontSize:12, lineHeight:"20px", textAlign:"center", padding:0 }}>×</button>
          </div>
        ))}
        {images.length < 5 && (
          <button onClick={() => inputRef.current.click()} disabled={uploading}
            style={{ width:90, height:90, borderRadius:6, border:"2px dashed #d1d5db", background:"#f9fafb", cursor:uploading?"wait":"pointer", color:"#6b7280", fontSize:12, fontWeight:600, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
            {uploading ? "⏳" : <><span style={{fontSize:24}}>📷</span><span>Add Photo</span></>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e => handleFiles(e.target.files)} />
      <p style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Max 5 photos · Auto-compressed before upload</p>
    </div>
  );
}

/* ─── Submit Tab ─── */
function SubmitTab() {
  const [form, setForm] = useState({ date:TODAY, project:"", site:"", gps:"", workTypes:[], description:"", quantity:"", issues:"" });
  const [teamImages, setTeamImages] = useState([]);
  const [equipmentImages, setEquipmentImages] = useState([]);
  const [areaImages, setAreaImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleWT = (wt) => set("workTypes", form.workTypes.includes(wt) ? form.workTypes.filter(x=>x!==wt) : [...form.workTypes, wt]);

  const submit = async () => {
    if (!form.project || !form.site || !form.description || form.workTypes.length === 0) {
      alert("กรุณากรอกข้อมูลให้ครบ (Project, Site, Work Type, Description)"); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teamImages, equipmentImages, areaImages }),
      });
      if (res.ok) {
        alert("✅ ส่งรายงานสำเร็จ");
        setForm({ date:TODAY, project:"", site:"", gps:"", workTypes:[], description:"", quantity:"", issues:"" });
        setTeamImages([]); setEquipmentImages([]); setAreaImages([]);
      } else {
        alert("❌ ส่งข้อมูลไม่สำเร็จ");
      }
    } catch (e) { alert("❌ " + e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><label style={labelStyle}>📅 Date</label><input type="date" value={form.date} style={inputStyle} onChange={e=>set("date",e.target.value)} /></div>
        <div style={{ flex:2 }}><label style={labelStyle}>🏗️ Project Name *</label><input value={form.project} placeholder="เช่น โครงการวางท่อ HDPE" style={inputStyle} onChange={e=>set("project",e.target.value)} /></div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><label style={labelStyle}>📍 Site *</label><input value={form.site} placeholder="เช่น Site A" style={inputStyle} onChange={e=>set("site",e.target.value)} /></div>
        <div style={{ flex:1 }}><label style={labelStyle}>🌐 GPS</label><input value={form.gps} placeholder="13.7563, 100.5018" style={inputStyle} onChange={e=>set("gps",e.target.value)} /></div>
      </div>

      <label style={{ ...labelStyle, marginBottom:8 }}>🔧 Work Type * (เลือกได้หลายรายการ)</label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14, padding:12, border:"1px solid #d1d5db", borderRadius:6, background:"#f9fafb" }}>
        {WORK_TYPE_OPTIONS.map(wt => (
          <label key={wt} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer", color:"#111" }}>
            <input type="checkbox" checked={form.workTypes.includes(wt)} onChange={()=>toggleWT(wt)} style={{ width:16, height:16, cursor:"pointer" }} />{wt}
          </label>
        ))}
      </div>

      <label style={labelStyle}>📝 Work Description *</label>
      <textarea value={form.description} placeholder="รายละเอียดงานที่ทำในวันนี้..." style={{ ...inputStyle, height:90, resize:"vertical" }} onChange={e=>set("description",e.target.value)} />

      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><label style={labelStyle}>📏 Quantity</label><input value={form.quantity} placeholder="เช่น 25m, 3 joints" style={inputStyle} onChange={e=>set("quantity",e.target.value)} /></div>
        <div style={{ flex:2 }}><label style={labelStyle}>⚠️ Issues</label><input value={form.issues} placeholder="ปัญหาหรือข้อสังเกต" style={inputStyle} onChange={e=>set("issues",e.target.value)} /></div>
      </div>

      {/* Photo sections */}
      <div style={{ borderTop:"2px solid #e5e7eb", paddingTop:16, marginTop:4 }}>
        <p style={{ fontWeight:700, color:"#1e3a5f", marginBottom:14, fontSize:14 }}>📷 Photos (Auto-compressed)</p>
        <ImageUploader label="👷 Working Team" category="team" images={teamImages} setImages={setTeamImages} />
        <ImageUploader label="🔧 Tools & Machines" category="equipment" images={equipmentImages} setImages={setEquipmentImages} />
        <ImageUploader label="📍 Work Area (Before & After)" category="area" images={areaImages} setImages={setAreaImages} />
      </div>

      <button onClick={submit} disabled={loading} style={{ padding:"13px 0", width:"100%", background:loading?"#9ca3af":"#1d4ed8", color:"white", border:"none", borderRadius:6, fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", marginTop:8 }}>
        {loading ? "⏳ กำลังส่ง..." : "🚀 Submit Daily Report"}
      </button>
    </div>
  );
}

/* ─── Dashboard Tab ─── */
function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/stats`).then(r=>r.json()).then(d=>{setStats(d);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign:"center", padding:40, color:"#6b7280" }}>⏳ กำลังโหลด...</p>;
  if (!stats)  return <p style={{ textAlign:"center", padding:40, color:"#ef4444" }}>❌ โหลดข้อมูลไม่สำเร็จ</p>;

  const maxWT   = Math.max(1, ...stats.by_work_type.map(x=>x.count));
  const maxProj = Math.max(1, ...stats.by_project.map(x=>x.count));

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[{label:"Total Reports",value:stats.total,color:"#1d4ed8",icon:"📋"},{label:"Today",value:stats.today,color:"#059669",icon:"📅"},{label:"This Week",value:stats.this_week,color:"#d97706",icon:"📆"},{label:"This Month",value:stats.this_month,color:"#7c3aed",icon:"🗓️"}].map(c=>(
          <div key={c.label} style={{ background:"white", borderRadius:10, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,.08)", borderLeft:`4px solid ${c.color}` }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{c.icon} {c.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:c.color, marginTop:4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {stats.by_work_type.length > 0 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:"#374151" }}>🔧 Work Type Breakdown</h3>
          {stats.by_work_type.map((wt,i)=>(
            <div key={wt.name} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#374151", marginBottom:3 }}><span>{wt.name}</span><span style={{ fontWeight:700 }}>{wt.count}</span></div>
              <div style={{ background:"#f3f4f6", borderRadius:4, height:10, overflow:"hidden" }}>
                <div style={{ width:`${(wt.count/maxWT)*100}%`, background:COLORS[i%COLORS.length], height:"100%", borderRadius:4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {stats.daily.length > 0 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:"#374151" }}>📈 Daily Activity (Last 30 Days)</h3>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:80, overflowX:"auto", paddingBottom:4 }}>
            {stats.daily.map(d=>(
              <div key={d.date} style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:22, flex:1 }}>
                <div title={`${d.date}: ${d.count}`} style={{ width:"100%", background:"#1d4ed8", borderRadius:"3px 3px 0 0", height:`${(d.count/Math.max(1,...stats.daily.map(x=>x.count)))*70}px`, minHeight:4 }} />
                <div style={{ fontSize:8, color:"#9ca3af", marginTop:2, transform:"rotate(-45deg)", whiteSpace:"nowrap" }}>{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.by_project.length > 0 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:"#374151" }}>🏗️ Reports by Project</h3>
          {stats.by_project.map((p,i)=>(
            <div key={p.project} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#374151", marginBottom:3 }}><span>{p.project||"(unnamed)"}</span><span style={{ fontWeight:700 }}>{p.count}</span></div>
              <div style={{ background:"#f3f4f6", borderRadius:4, height:10, overflow:"hidden" }}>
                <div style={{ width:`${(p.count/maxProj)*100}%`, background:COLORS[(i+3)%COLORS.length], height:"100%", borderRadius:4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {stats.by_site.length > 0 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:"#374151" }}>📍 Reports by Site</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {stats.by_site.map((s,i)=>(
              <div key={s.site} style={{ background:COLORS[i%COLORS.length], color:"white", borderRadius:20, padding:"5px 14px", fontSize:13, fontWeight:600 }}>
                {s.site||"(unnamed)"} <span style={{ opacity:.85 }}>({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}><p style={{ fontSize:32 }}>📊</p><p>ยังไม่มีข้อมูล กรุณาเพิ่มรายงานก่อน</p></div>}
    </div>
  );
}

/* ─── View Tab ─── */
function ViewTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports`);
      const data = await res.json();
      setReports(data.data || []);
    } catch (e) { alert("❌ " + e.message); }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const exportExcel = () => window.open(`${API}/export`, "_blank");
  const openReport = (id) => window.open(`${API}/report/${id}`, "_blank");
  const totalPhotos = (r) => (r.teamImages||[]).length + (r.equipmentImages||[]).length + (r.areaImages||[]).length;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ fontWeight:700, fontSize:15, color:"#374151" }}>ทั้งหมด {reports.length} รายการ</span>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={fetchReports} style={{ padding:"8px 14px", background:"#6b7280", color:"white", border:"none", borderRadius:6, fontSize:13, cursor:"pointer" }}>🔄 Refresh</button>
          <button onClick={exportExcel} disabled={reports.length===0} style={{ padding:"8px 14px", background:reports.length===0?"#d1d5db":"#16a34a", color:"white", border:"none", borderRadius:6, fontSize:13, fontWeight:700, cursor:reports.length===0?"not-allowed":"pointer" }}>
            📥 Export Excel
          </button>
        </div>
      </div>

      {loading && <p style={{ textAlign:"center", color:"#6b7280", padding:20 }}>⏳ กำลังโหลด...</p>}
      {!loading && reports.length===0 && <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}><p style={{ fontSize:32 }}>📋</p><p>ยังไม่มีรายงาน</p></div>}

      {reports.map((r) => (
        <div key={r.id} style={{ border:"1px solid #e5e7eb", borderRadius:8, marginBottom:10, background:"white", overflow:"hidden" }}>
          {/* Header row */}
          <div style={{ padding:"12px 14px", cursor:"pointer" }} onClick={()=>setExpanded(expanded===r.id?null:r.id)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <span style={{ fontWeight:700, fontSize:15, color:"#1d4ed8" }}>{r.project||"-"}</span>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {totalPhotos(r)>0 && <span style={{ fontSize:11, background:"#dbeafe", color:"#1d4ed8", padding:"2px 7px", borderRadius:20, fontWeight:600 }}>📷 {totalPhotos(r)}</span>}
                <span style={{ fontSize:12, color:"#6b7280", background:"#f3f4f6", padding:"2px 8px", borderRadius:20 }}>{r.date||"-"}</span>
                <span style={{ fontSize:12, color:"#9ca3af" }}>{expanded===r.id?"▲":"▼"}</span>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 16px", fontSize:13, color:"#374151", marginTop:6 }}>
              <span>📍 {r.site||"-"}</span>
              <span>🔧 {(r.workTypes||[]).join(", ")||"-"}</span>
            </div>
          </div>

          {/* Expanded detail */}
          {expanded===r.id && (
            <div style={{ borderTop:"1px solid #f3f4f6", padding:"12px 14px", background:"#fafafa" }}>
              <p style={{ margin:"0 0 8px", fontSize:13 }}>📝 {r.description||"-"}</p>
              <div style={{ display:"flex", gap:16, fontSize:13, color:"#374151", marginBottom:10 }}>
                <span>📏 {r.quantity||"-"}</span>
                {r.issues && r.issues!=="None" && <span style={{ color:"#b45309" }}>⚠️ {r.issues}</span>}
              </div>

              {/* Photo thumbnails */}
              {[["👷 Working Team", r.teamImages],["🔧 Tools & Machines", r.equipmentImages],["📍 Work Area", r.areaImages]].map(([lbl, imgs])=>
                imgs && imgs.length > 0 && (
                  <div key={lbl} style={{ marginBottom:10 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:6 }}>{lbl}</p>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {imgs.map((url,i)=><img key={i} src={url} alt="" style={{ width:80, height:80, objectFit:"cover", borderRadius:5, border:"1px solid #e5e7eb" }} />)}
                    </div>
                  </div>
                )
              )}

              <button onClick={()=>openReport(r.id)} style={{ marginTop:6, padding:"8px 16px", background:"#1d4ed8", color:"white", border:"none", borderRadius:6, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                📄 Open Full Report (Print / PDF)
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main App ─── */
export default function Home() {
  const [tab, setTab] = useState("submit");
  const tabs = [{ id:"submit", label:"✏️ Submit" }, { id:"dashboard", label:"📊 Dashboard" }, { id:"view", label:"📋 Reports" }];

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", padding:"20px 16px", fontFamily:"Segoe UI, Arial, sans-serif" }}>
      <div style={{ maxWidth:620, margin:"auto", background:"white", borderRadius:12, boxShadow:"0 4px 20px rgba(0,0,0,.10)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)", padding:"20px 24px", color:"white" }}>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>📋 LXT Daily Progress Report</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, opacity:.85 }}>LXT Network Co., Ltd. — Field Progress Reporting</p>
        </div>
        <div style={{ display:"flex", gap:6, padding:"14px 24px 0" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"9px 0", background:tab===t.id?"#1d4ed8":"#f3f4f6", color:tab===t.id?"white":"#374151", border:"none", fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:6 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ padding:"20px 24px 24px" }}>
          {tab==="submit"    && <SubmitTab />}
          {tab==="dashboard" && <DashboardTab />}
          {tab==="view"      && <ViewTab />}
        </div>
      </div>
    </div>
  );
}
