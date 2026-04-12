from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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

@app.post("/reports")
def create_report(data: dict):
    payload = {
        "date": data.get("date", datetime.date.today().isoformat()),
        "project": data.get("project", ""),
        "site": data.get("site", ""),
        "gps": data.get("gps", ""),
        "work_types": json.dumps(data.get("workTypes", [])),
        "description": data.get("description", ""),
        "quantity": data.get("quantity", ""),
        "issues": data.get("issues", ""),
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/reports", headers=sb_headers(), json=payload)
    if r.status_code in (200, 201):
        return {"status": "success"}
    return {"status": "error", "detail": r.text}

@app.get("/reports")
def get_reports():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/reports?order=date.desc,id.desc",
        headers={**sb_headers(), "Prefer": "count=exact"},
    )
    rows = r.json()
    data = []
    for row in rows:
        data.append({
            "id": row["id"],
            "date": row["date"],
            "project": row["project"],
            "site": row["site"],
            "gps": row["gps"],
            "workTypes": json.loads(row["work_types"] or "[]"),
            "description": row["description"],
            "quantity": row["quantity"],
            "issues": row["issues"],
        })
    return {"total": len(data), "data": data}

@app.delete("/reports")
def clear_reports():
    requests.delete(f"{SUPABASE_URL}/rest/v1/reports?id=gte.0", headers=sb_headers())
    return {"status": "cleared"}

@app.get("/stats")
def get_stats():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?order=date.asc", headers=sb_headers())
    rows = r.json()

    today = datetime.date.today().isoformat()
    week_start = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
    month_start = datetime.date.today().replace(day=1).isoformat()

    total = len(rows)
    today_count = sum(1 for row in rows if row.get("date") == today)
    week_count = sum(1 for row in rows if row.get("date", "") >= week_start)
    month_count = sum(1 for row in rows if row.get("date", "") >= month_start)

    work_type_counts = {}
    for row in rows:
        for t in json.loads(row.get("work_types") or "[]"):
            work_type_counts[t] = work_type_counts.get(t, 0) + 1

    thirty_days_ago = (datetime.date.today() - datetime.timedelta(days=29)).isoformat()
    daily_map = {}
    for row in rows:
        d = row.get("date", "")
        if d >= thirty_days_ago:
            daily_map[d] = daily_map.get(d, 0) + 1
    daily = [{"date": k, "count": v} for k, v in sorted(daily_map.items())]

    project_map = {}
    for row in rows:
        p = row.get("project", "")
        project_map[p] = project_map.get(p, 0) + 1
    by_project = sorted([{"project": k, "count": v} for k, v in project_map.items()], key=lambda x: -x["count"])[:10]

    site_map = {}
    for row in rows:
        s = row.get("site", "")
        site_map[s] = site_map.get(s, 0) + 1
    by_site = sorted([{"site": k, "count": v} for k, v in site_map.items()], key=lambda x: -x["count"])[:10]

    return {
        "total": total,
        "today": today_count,
        "this_week": week_count,
        "this_month": month_count,
        "by_work_type": [{"name": k, "count": v} for k, v in sorted(work_type_counts.items(), key=lambda x: -x[1])],
        "daily": daily,
        "by_project": by_project,
        "by_site": by_site,
    }

@app.get("/export")
def export_excel():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/reports?order=date.asc,id.asc", headers=sb_headers())
    rows = r.json()

    wb = Workbook()
    ws = wb.active
    ws.title = "LXT Daily Report"

    headers = ["Date", "Project", "Site", "GPS", "Work Type", "Description", "Quantity", "Issues"]
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)

    ws.append(headers)
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    col_widths = [12, 25, 15, 20, 25, 40, 15, 30]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width

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
        ])

    ws.freeze_panes = "A2"

    filename = f"LXT_Report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"
    wb.save(filepath)

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
