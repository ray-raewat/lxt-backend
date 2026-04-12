from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import datetime
import json
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = "https://woicdagfrkmtxhmqteyy.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

def sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

@app.get("/health")
def health():
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?limit=1", headers=sb_headers(), timeout=10)
        return {"db": "connected", "status": r.status_code}
    except Exception as e:
        return {"db": "error", "detail": str(e)}

# ── Image Upload ──────────────────────────────────────────────────────────────

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...), category: str = Form(...)):
    content = await file.read()
    ts = int(datetime.datetime.now().timestamp() * 1000)
    filename = f"{category}/{ts}.jpg"
    r = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/report-images/{filename}",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "image/jpeg",
        },
        data=content,
    )
    if r.status_code in (200, 201):
        return {"url": f"{SUPABASE_URL}/storage/v1/object/public/report-images/{filename}"}
    return {"error": r.text}

# ── Reports CRUD ──────────────────────────────────────────────────────────────

@app.post("/reports")
def create_report(data: dict):
    payload = {
        "date":             data.get("date", datetime.date.today().isoformat()),
        "project":          data.get("project", ""),
        "site":             data.get("site", ""),
        "gps":              data.get("gps", ""),
        "work_types":       json.dumps(data.get("workTypes", [])),
        "description":      data.get("description", ""),
        "quantity":         data.get("quantity", ""),
        "issues":           data.get("issues", ""),
        "team_images":      json.dumps(data.get("teamImages", [])),
        "equipment_images": json.dumps(data.get("equipmentImages", [])),
        "area_images":      json.dumps(data.get("areaImages", [])),
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/reports", headers=sb_headers(), json=payload)
    if r.status_code in (200, 201):
        return {"status": "success"}
    return {"status": "error", "detail": r.text}

def _parse_row(row):
    return {
        "id":               row["id"],
        "date":             row["date"],
        "project":          row["project"],
        "site":             row["site"],
        "gps":              row["gps"],
        "workTypes":        json.loads(row.get("work_types") or "[]"),
        "description":      row["description"],
        "quantity":         row["quantity"],
        "issues":           row["issues"],
        "teamImages":       json.loads(row.get("team_images") or "[]"),
        "equipmentImages":  json.loads(row.get("equipment_images") or "[]"),
        "areaImages":       json.loads(row.get("area_images") or "[]"),
    }

@app.get("/reports")
def get_reports():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?order=date.desc,id.desc", headers=sb_headers())
    rows = r.json()
    data = [_parse_row(row) for row in rows]
    return {"total": len(data), "data": data}

@app.delete("/reports")
def clear_reports():
    requests.delete(f"{SUPABASE_URL}/rest/v1/reports?id=gte.0", headers=sb_headers())
    return {"status": "cleared"}

# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats")
def get_stats():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?order=date.asc", headers=sb_headers())
    rows = r.json()

    today       = datetime.date.today().isoformat()
    week_start  = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
    month_start = datetime.date.today().replace(day=1).isoformat()

    total       = len(rows)
    today_count = sum(1 for r in rows if r.get("date") == today)
    week_count  = sum(1 for r in rows if r.get("date", "") >= week_start)
    month_count = sum(1 for r in rows if r.get("date", "") >= month_start)

    wt_counts = {}
    for row in rows:
        for t in json.loads(row.get("work_types") or "[]"):
            wt_counts[t] = wt_counts.get(t, 0) + 1

    thirty_ago = (datetime.date.today() - datetime.timedelta(days=29)).isoformat()
    daily_map  = {}
    for row in rows:
        d = row.get("date", "")
        if d >= thirty_ago:
            daily_map[d] = daily_map.get(d, 0) + 1
    daily = [{"date": k, "count": v} for k, v in sorted(daily_map.items())]

    proj_map = {}
    for row in rows:
        p = row.get("project", "")
        proj_map[p] = proj_map.get(p, 0) + 1
    by_project = sorted([{"project": k, "count": v} for k, v in proj_map.items()], key=lambda x: -x["count"])[:10]

    site_map = {}
    for row in rows:
        s = row.get("site", "")
        site_map[s] = site_map.get(s, 0) + 1
    by_site = sorted([{"site": k, "count": v} for k, v in site_map.items()], key=lambda x: -x["count"])[:10]

    return {
        "total": total, "today": today_count,
        "this_week": week_count, "this_month": month_count,
        "by_work_type": [{"name": k, "count": v} for k, v in sorted(wt_counts.items(), key=lambda x: -x[1])],
        "daily": daily, "by_project": by_project, "by_site": by_site,
    }

# ── HTML Daily Report (per report) ───────────────────────────────────────────

def _photo_grid(title, urls):
    if not urls:
        return f'<div class="section"><div class="section-title">{title}</div><p class="no-photo">No photos</p></div>'
    photos = "".join(f'<img src="{u}" alt="photo" onerror="this.style.display=\'none\'">' for u in urls)
    return f'<div class="section"><div class="section-title">{title}</div><div class="photos">{photos}</div></div>'

@app.get("/report/{report_id}", response_class=HTMLResponse)
def export_html_report(report_id: int):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?id=eq.{report_id}", headers=sb_headers())
    rows = r.json()
    if not rows:
        return HTMLResponse("<h2>Report not found</h2>", status_code=404)
    rep = _parse_row(rows[0])

    work_types  = ", ".join(rep["workTypes"]) or "-"
    team_grid   = _photo_grid("👷 Working Team", rep["teamImages"])
    equip_grid  = _photo_grid("🔧 Tools &amp; Machines", rep["equipmentImages"])
    area_grid   = _photo_grid("📍 Work Area (Before &amp; After)", rep["areaImages"])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LXT Daily Report – {rep['date']}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; color: #111; background: #f0f4f8; padding: 20px; }}
  .wrapper {{ max-width: 860px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.12); }}
  .header {{ background: linear-gradient(135deg,#1e3a5f,#1d4ed8); color: white; padding: 22px 28px; }}
  .header h1 {{ font-size: 20px; font-weight: 800; }}
  .header p {{ font-size: 13px; opacity: .85; margin-top: 4px; }}
  .body {{ padding: 24px 28px; }}
  .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }}
  .field {{ background: #f8fafc; border-radius: 6px; padding: 10px 14px; }}
  .field .lbl {{ font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .5px; }}
  .field .val {{ font-weight: 700; color: #1e3a5f; margin-top: 3px; font-size: 14px; }}
  .full {{ grid-column: 1 / -1; }}
  .section {{ margin-bottom: 24px; }}
  .section-title {{ font-size: 15px; font-weight: 700; color: #1e3a5f; border-bottom: 2px solid #1d4ed8; padding-bottom: 6px; margin-bottom: 12px; }}
  .photos {{ display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }}
  .photos img {{ width: 100%; height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }}
  .no-photo {{ color: #9ca3af; font-style: italic; font-size: 13px; }}
  .print-btn {{ background: #1d4ed8; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 700; margin-bottom: 20px; }}
  .footer {{ text-align: center; padding: 14px; background: #f8fafc; color: #9ca3af; font-size: 12px; }}
  @media print {{
    body {{ background: white; padding: 0; }}
    .wrapper {{ box-shadow: none; }}
    .print-btn {{ display: none; }}
    .photos img {{ break-inside: avoid; }}
  }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📋 LXT Daily Progress Report</h1>
    <p>LXT Network Co., Ltd. — Field Progress Reporting</p>
  </div>
  <div class="body">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <div class="info-grid">
      <div class="field"><div class="lbl">📅 Date</div><div class="val">{rep['date']}</div></div>
      <div class="field"><div class="lbl">🏗️ Project</div><div class="val">{rep['project'] or '-'}</div></div>
      <div class="field"><div class="lbl">📍 Site</div><div class="val">{rep['site'] or '-'}</div></div>
      <div class="field"><div class="lbl">🌐 GPS</div><div class="val">{rep['gps'] or '-'}</div></div>
      <div class="field full"><div class="lbl">🔧 Work Type</div><div class="val">{work_types}</div></div>
      <div class="field full"><div class="lbl">📝 Description</div><div class="val">{rep['description'] or '-'}</div></div>
      <div class="field"><div class="lbl">📏 Quantity</div><div class="val">{rep['quantity'] or '-'}</div></div>
      <div class="field"><div class="lbl">⚠️ Issues</div><div class="val">{rep['issues'] or '-'}</div></div>
    </div>
    {team_grid}
    {equip_grid}
    {area_grid}
  </div>
  <div class="footer">Generated by LXT Daily Report System — {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
</div>
</body>
</html>"""
    return HTMLResponse(html)

# ── Excel Export (all reports) ────────────────────────────────────────────────

@app.get("/export")
def export_excel():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?order=date.asc,id.asc", headers=sb_headers())
    rows = r.json()

    wb = Workbook()
    ws = wb.active
    ws.title = "LXT Daily Report"

    headers = ["Date", "Project", "Site", "GPS", "Work Type", "Description", "Quantity", "Issues",
               "Team Photos", "Equipment Photos", "Area Photos"]
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)

    ws.append(headers)
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    col_widths = [12, 25, 15, 20, 25, 40, 15, 30, 40, 40, 40]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    for row in rows:
        ws.append([
            row.get("date", ""),
            row.get("project", ""),
            row.get("site", ""),
            row.get("gps", ""),
            ", ".join(json.loads(row.get("work_types") or "[]")),
            row.get("description", ""),
            row.get("quantity", ""),
            row.get("issues", ""),
            " | ".join(json.loads(row.get("team_images") or "[]")),
            " | ".join(json.loads(row.get("equipment_images") or "[]")),
            " | ".join(json.loads(row.get("area_images") or "[]")),
        ])

    ws.freeze_panes = "A2"
    filename = f"LXT_Report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"
    wb.save(filepath)

    return FileResponse(path=filepath, filename=filename,
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
