"use client";
import { useState, useEffect } from "react";

const API = "https://lxt-backend.onrender.com";

const WORK_TYPE_OPTIONS = [
  "Pipe Jacking",
  "HDD (Horizontal Directional Drilling)",
  "Open Trench",
  "Cable Pulling",
  "Jointing / Splicing",
  "Testing & Commissioning",
  "Survey / Setting Out",
  "Backfilling & Reinstatement",
  "Manhole",
  "Others",
];

const TODAY = new Date().toISOString().split("T")[0];

const COLORS = ["#1d4ed8","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#65a30d","#ea580c","#0284c7"];

/* ─── Shared styles ─── */
const card = {
  background: "white",
  borderRadius: 10,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  padding: 18,
  marginBottom: 14,
};

const inputStyle = {
  padding: "10px 12px",
  width: "100%",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#111",
  fontSize: 14,
  boxSizing: "border-box",
  marginTop: 4,
  marginBottom: 14,
};

const labelStyle = { fontWeight: 600, fontSize: 13, color: "#374151", display: "block" };

/* ─── Submit Tab ─── */
function SubmitTab() {
  const [form, setForm] = useState({
    date: TODAY, project: "", site: "", gps: "",
    workTypes: [], description: "", quantity: "", issues: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleWorkType = (wt) =>
    set("workTypes", form.workTypes.includes(wt)
      ? form.workTypes.filter((x) => x !== wt)
      : [...form.workTypes, wt]);

  const submit = async () => {
    if (!form.project || !form.site || !form.description || form.workTypes.length === 0) {
      alert("กรุณากรอกข้อมูลให้ครบ (Project, Site, Work Type, Description)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert("✅ ส่งรายงานสำเร็จ");
        setForm({ date: TODAY, project: "", site: "", gps: "", workTypes: [], description: "", quantity: "", issues: "" });
      } else {
        alert("❌ ส่งข้อมูลไม่สำเร็จ");
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>📅 Date</label>
          <input type="date" value={form.date} style={inputStyle} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>🏗️ Project Name *</label>
          <input value={form.project} placeholder="เช่น โครงการวางท่อ HDPE" style={inputStyle} onChange={(e) => set("project", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>📍 Site *</label>
          <input value={form.site} placeholder="เช่น Site A" style={inputStyle} onChange={(e) => set("site", e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>🌐 GPS</label>
          <input value={form.gps} placeholder="เช่น 13.7563, 100.5018" style={inputStyle} onChange={(e) => set("gps", e.target.value)} />
        </div>
      </div>
      <label style={{ ...labelStyle, marginBottom: 8 }}>🔧 Work Type * (เลือกได้หลายรายการ)</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14, padding: 12, border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb" }}>
        {WORK_TYPE_OPTIONS.map((wt) => (
          <label key={wt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#111" }}>
            <input type="checkbox" checked={form.workTypes.includes(wt)} onChange={() => toggleWorkType(wt)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            {wt}
          </label>
        ))}
      </div>
      <label style={labelStyle}>📝 Work Description *</label>
      <textarea value={form.description} placeholder="รายละเอียดงานที่ทำในวันนี้..." style={{ ...inputStyle, height: 100, resize: "vertical" }} onChange={(e) => set("description", e.target.value)} />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>📏 Quantity / Progress</label>
          <input value={form.quantity} placeholder="เช่น 25m, 3 joints" style={inputStyle} onChange={(e) => set("quantity", e.target.value)} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>⚠️ Issues / Remarks</label>
          <input value={form.issues} placeholder="ปัญหาหรือข้อสังเกต" style={inputStyle} onChange={(e) => set("issues", e.target.value)} />
        </div>
      </div>
      <button onClick={submit} disabled={loading} style={{ padding: "13px 0", width: "100%", background: loading ? "#9ca3af" : "#1d4ed8", color: "white", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 6 }}>
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
    fetch(`${API}/stats`)
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>⏳ กำลังโหลด...</p>;
  if (!stats) return <p style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>❌ โหลดข้อมูลไม่สำเร็จ</p>;

  const maxWT = Math.max(1, ...stats.by_work_type.map((x) => x.count));
  const maxDaily = Math.max(1, ...stats.daily.map((x) => x.count));
  const maxProject = Math.max(1, ...stats.by_project.map((x) => x.count));

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Reports", value: stats.total, color: "#1d4ed8", icon: "📋" },
          { label: "Today", value: stats.today, color: "#059669", icon: "📅" },
          { label: "This Week", value: stats.this_week, color: "#d97706", icon: "📆" },
          { label: "This Month", value: stats.this_month, color: "#7c3aed", icon: "🗓️" },
        ].map((c) => (
          <div key={c.label} style={{ background: "white", borderRadius: 10, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Work Type Breakdown */}
      {stats.by_work_type.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>🔧 Work Type Breakdown</h3>
          {stats.by_work_type.map((wt, i) => (
            <div key={wt.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginBottom: 3 }}>
                <span>{wt.name}</span>
                <span style={{ fontWeight: 700 }}>{wt.count}</span>
              </div>
              <div style={{ background: "#f3f4f6", borderRadius: 4, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${(wt.count / maxWT) * 100}%`, background: COLORS[i % COLORS.length], height: "100%", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Activity (last 30 days) */}
      {stats.daily.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>📈 Daily Activity (Last 30 Days)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, overflowX: "auto", paddingBottom: 4 }}>
            {stats.daily.map((d, i) => (
              <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 22, flex: 1 }}>
                <div title={`${d.date}: ${d.count} reports`} style={{ width: "100%", background: "#1d4ed8", borderRadius: "3px 3px 0 0", height: `${(d.count / maxDaily) * 70}px`, minHeight: 4, cursor: "default" }} />
                <div style={{ fontSize: 8, color: "#9ca3af", marginTop: 2, transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                  {d.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Project */}
      {stats.by_project.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>🏗️ Reports by Project</h3>
          {stats.by_project.map((p, i) => (
            <div key={p.project} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginBottom: 3 }}>
                <span>{p.project || "(unnamed)"}</span>
                <span style={{ fontWeight: 700 }}>{p.count}</span>
              </div>
              <div style={{ background: "#f3f4f6", borderRadius: 4, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${(p.count / maxProject) * 100}%`, background: COLORS[(i + 3) % COLORS.length], height: "100%", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* By Site */}
      {stats.by_site.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>📍 Reports by Site</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {stats.by_site.map((s, i) => (
              <div key={s.site} style={{ background: COLORS[i % COLORS.length], color: "white", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>
                {s.site || "(unnamed)"} <span style={{ opacity: 0.85 }}>({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <p style={{ fontSize: 32 }}>📊</p>
          <p>ยังไม่มีข้อมูล กรุณาเพิ่มรายงานก่อน</p>
        </div>
      )}
    </div>
  );
}

/* ─── View Tab ─── */
function ViewTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports`);
      const data = await res.json();
      setReports(data.data || []);
    } catch (err) {
      alert("❌ โหลดข้อมูลไม่สำเร็จ: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const exportExcel = () => window.open(`${API}/export`, "_blank");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#374151" }}>ทั้งหมด {reports.length} รายการ</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchReports} style={{ padding: "8px 14px", background: "#6b7280", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>🔄 Refresh</button>
          <button onClick={exportExcel} disabled={reports.length === 0} style={{ padding: "8px 14px", background: reports.length === 0 ? "#d1d5db" : "#16a34a", color: "white", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: reports.length === 0 ? "not-allowed" : "pointer" }}>
            📥 Export Excel
          </button>
        </div>
      </div>
      {loading && <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>⏳ กำลังโหลด...</p>}
      {!loading && reports.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <p style={{ fontSize: 32 }}>📋</p><p>ยังไม่มีรายงาน</p>
        </div>
      )}
      {reports.map((r, i) => (
        <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 10, background: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1d4ed8" }}>{r.project || "-"}</span>
            <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 20 }}>{r.date || "-"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 13, color: "#374151" }}>
            <span>📍 Site: <b>{r.site || "-"}</b></span>
            <span>🌐 GPS: <b>{r.gps || "-"}</b></span>
            <span>🔧 Work: <b>{(r.workTypes || []).join(", ") || "-"}</b></span>
            <span>📏 Qty: <b>{r.quantity || "-"}</b></span>
          </div>
          <p style={{ margin: "8px 0 4px", fontSize: 13, color: "#111" }}>📝 {r.description || "-"}</p>
          {r.issues && r.issues !== "None" && (
            <p style={{ margin: 0, fontSize: 12, color: "#b45309", background: "#fffbeb", padding: "4px 8px", borderRadius: 4 }}>⚠️ {r.issues}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main App ─── */
export default function Home() {
  const [tab, setTab] = useState("submit");

  const tabs = [
    { id: "submit", label: "✏️ Submit" },
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "view", label: "📋 Reports" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", padding: "20px 16px", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "auto", background: "white", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.10)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)", padding: "20px 24px", color: "white" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📋 LXT Daily Progress Report</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>LXT Network Co., Ltd. — Field Progress Reporting</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "14px 24px 0" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px 0", background: tab === t.id ? "#1d4ed8" : "#f3f4f6", color: tab === t.id ? "white" : "#374151", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", borderRadius: 6 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 24px" }}>
          {tab === "submit" && <SubmitTab />}
          {tab === "dashboard" && <DashboardTab />}
          {tab === "view" && <ViewTab />}
        </div>
      </div>
    </div>
  );
}
