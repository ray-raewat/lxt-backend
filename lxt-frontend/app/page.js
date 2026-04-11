"use client";
import { useState } from "react";

export default function Home() {
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const sendData = async () => {
    if (!project || !description) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://lxt-backend.onrender.com/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project,
          site: "Site A",
          gps: "13,100",
          workTypes: ["Pipe Jacking"],
          description,
          quantity: "10m",
          issues: "None",
          images: [],
        }),
      });

      if (res.ok) {
        alert("✅ ส่งข้อมูลสำเร็จ");
        setProject("");
        setDescription("");
      } else {
        alert("❌ ส่งข้อมูลไม่สำเร็จ");
      }
    } catch (err) {
      alert("❌ เกิด error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div style={{
      padding: 20,
      maxWidth: 500,
      margin: "auto",
      fontFamily: "Arial"
    }}>
      
      <h2 style={{ marginBottom: 20 }}>
        📋 LXT Daily Progress Report
      </h2>

      {/* Project */}
      <label>Project Name</label>
<input
  value={project}
  placeholder="เช่น โครงการวางท่อ HDPE"
  style={{
    padding: 10,
    width: "100%",
    marginTop: 5,
    marginBottom: 15,
    borderRadius: 5,
    border: "1px solid #ccc",
    background: "white",     // ✅ เพิ่มอันนี้
    color: "black"           // ✅ เพิ่มอันนี้
  }}
  onChange={(e) => setProject(e.target.value)}
/>
      {/* Description */}
      <label>Work Description</label>
      <textarea
  value={description}
  placeholder="รายละเอียดงานวันนี้..."
  style={{
    padding: 10,
    width: "100%",
    height: 120,
    marginTop: 5,
    marginBottom: 20,
    borderRadius: 5,
    border: "1px solid #ccc",
    background: "white",     // ✅ เพิ่ม
    color: "black"           // ✅ เพิ่ม
  }}
  onChange={(e) => setDescription(e.target.value)}
/>

      {/* Button */}
      <button
        onClick={sendData}
        disabled={loading}
        style={{
          padding: 12,
          width: "100%",
          background: loading ? "#999" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 5,
          fontSize: 16,
          cursor: "pointer"
        }}
      >
        {loading ? "กำลังส่ง..." : "🚀 Submit Report"}
      </button>

    </div>
  );
}