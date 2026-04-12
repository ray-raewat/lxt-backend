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

function SubmitTab() {
  const [form, setForm] = useState({
    date: TODAY,
    project: "",
    site: "",
    gps: "",
    workTypes: [],
    description: "",
    quantity: "",
    issues: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleWorkType = (wt) => {
    set(
      "workTypes",
      form.workTypes.includes(wt)
        ? form.workTypes.filter((x) => x !== wt)
        : [...form.workTypes, wt]
    );
  };

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
        alert("❌ ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    }
    setLoading(false);
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

  const labelStyle = {
    fontWeight: 600,
    fontSize: 13,
    color: "#374151",
    display: "block",
  };

  return (
    <div>
      {/* Row: Date + Project */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>📅 Date</label>
          <input type="date" value={form.date} style={inputStyle} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>🏗️ Project Name *</label>
          <input
            value={form.project}
            placeholder="เช่น โครงการวางท่อ HDPE"
            style={inputStyle}
            onChange={(e) => set("project", e.target.value)}
          />
        </div>
      </div>

      {/* Row: Site + GPS */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>📍 Site *</label>
          <input
            value={form.site}
            placeholder="เช่น Site A, กม.10+500"
            style={inputStyle}
            onChange={(e) => set("site", e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>🌐 GPS Coordinates</label>
          <input
            value={form.gps}
            placeholder="เช่น 13.7563, 100.5018"
            style={inputStyle}
            onChange={(e) => set("gps", e.target.value)}
          />
        </div>
      </div>

      {/* Work Types */}
      <label style={{ ...labelStyle, marginBottom: 8 }}>🔧 Work Type * (เลือกได้หลายรายการ)</label>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        marginBottom: 14,
        padding: 12,
        border: "1px solid #d1d5db",
        borderRadius: 6,
        background: "#f9fafb",
      }}>
        {WORK_TYPE_OPTIONS.map((wt) => (
          <label key={wt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#111" }}>
            <input
              type="checkbox"
              checked={form.workTypes.includes(wt)}
              onChange={() => toggleWorkType(wt)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            {wt}
          </label>
        ))}
      </div>

      {/* Description */}
      <label style={labelStyle}>📝 Work Description *</label>
      <textarea
        value={form.description}
        placeholder="รายละเอียดงานที่ทำในวันนี้..."
        style={{ ...inputStyle, height: 100, resize: "vertical" }}
        onChange={(e) => set("description", e.target.value)}
      />

      {/* Row: Quantity + Issues */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>📏 Quantity / Progress</label>
          <input
            value={form.quantity}
            placeholder="เช่น 25m, 3 joints"
            style={inputStyle}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>⚠️ Issues / Remarks</label>
          <input
            value={form.issues}
            placeholder="ปัญหาหรือข้อสังเกต (ถ้าไม่มีใส่ None)"
            style={inputStyle}
            onChange={(e) => set("issues", e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        style={{
          padding: "13px 0",
          width: "100%",
          background: loading ? "#9ca3af" : "#1d4ed8",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          marginTop: 6,
          letterSpacing: 0.5,
        }}
      >
        {loading ? "⏳ กำลังส่ง..." : "🚀 Submit Daily Report"}
      </button>
    </div>
  );
}

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

  const exportExcel = () => {
    window.open(`${API}/export`, "_blank");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#374151" }}>
          ทั้งหมด {reports.length} รายการ
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={fetchReports}
            style={{ padding: "8px 14px", background: "#6b7280", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={exportExcel}
            disabled={reports.length === 0}
            style={{
              padding: "8px 14px",
              background: reports.length === 0 ? "#d1d5db" : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: reports.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            📥 Export Excel
          </button>
        </div>
      </div>

      {loading && <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>⏳ กำลังโหลด...</p>}

      {!loading && reports.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <p style={{ fontSize: 32 }}>📋</p>
          <p>ยังไม่มีรายงาน</p>
        </div>
      )}

      {reports.map((r, i) => (
        <div key={i} style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 14,
          marginBottom: 10,
          background: "white",
        }}>
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
            <p style={{ margin: 0, fontSize: 12, color: "#b45309", background: "#fffbeb", padding: "4px 8px", borderRadius: 4 }}>
              ⚠️ {r.issues}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("submit");

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1,
        padding: "10px 0",
        background: tab === id ? "#1d4ed8" : "#f3f4f6",
        color: tab === id ? "white" : "#374151",
        border: "none",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        borderRadius: tab === id ? 6 : 6,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f4f8",
      padding: "20px 16px",
      fontFamily: "Segoe UI, Arial, sans-serif",
    }}>
      <div style={{
        maxWidth: 600,
        margin: "auto",
        background: "white",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
          padding: "20px 24px",
          color: "white",
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>
            📋 LXT Daily Progress Report
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>
            LXT Network Co., Ltd. — Field Progress Reporting
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, padding: "16px 24px 0" }}>
          {tabBtn("submit", "✏️ Submit Report")}
          {tabBtn("view", "📊 View Reports")}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 24px" }}>
          {tab === "submit" ? <SubmitTab /> : <ViewTab />}
        </div>
      </div>
    </div>
  );
}
