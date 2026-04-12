from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import datetime
import psycopg2
import psycopg2.extras
import json
import os
from urllib.parse import urlparse, unquote

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")

def get_db():
    url = urlparse(DATABASE_URL)
    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port or 5432,
        user=url.username,
        password=unquote(url.password or ""),
        dbname=url.path.lstrip("/"),
        sslmode="require",
    )
    return conn

def init_db():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                date TEXT,
                project TEXT,
                site TEXT,
                gps TEXT,
                work_types TEXT,
                description TEXT,
                quantity TEXT,
                issues TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Database connected and table ready.")
    except Exception as e:
        print(f"⚠️ DB init error (will retry on first request): {e}")

init_db()

@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

@app.get("/health")
def health():
    try:
        conn = get_db()
        conn.close()
        return {"db": "connected", "url_host": urlparse(DATABASE_URL).hostname}
    except Exception as e:
        return {"db": "error", "detail": str(e), "url_set": bool(DATABASE_URL)}

@app.post("/reports")
def create_report(data: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO reports (date, project, site, gps, work_types, description, quantity, issues)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data.get("date", datetime.date.today().isoformat()),
        data.get("project", ""),
        data.get("site", ""),
        data.get("gps", ""),
        json.dumps(data.get("workTypes", [])),
        data.get("description", ""),
        data.get("quantity", ""),
        data.get("issues", ""),
    ))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success"}

@app.get("/reports")
def get_reports():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM reports ORDER BY date DESC, id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    data = []
    for r in rows:
        data.append({
            "id": r["id"],
            "date": r["date"],
            "project": r["project"],
            "site": r["site"],
            "gps": r["gps"],
            "workTypes": json.loads(r["work_types"] or "[]"),
            "description": r["description"],
            "quantity": r["quantity"],
            "issues": r["issues"],
        })
    return {"total": len(data), "data": data}

@app.delete("/reports")
def clear_reports():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM reports")
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "cleared"}

@app.get("/stats")
def get_stats():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    today = datetime.date.today().isoformat()
    week_start = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
    month_start = datetime.date.today().replace(day=1).isoformat()

    cur.execute("SELECT COUNT(*) as count FROM reports")
    total = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) as count FROM reports WHERE date = %s", (today,))
    today_count = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) as count FROM reports WHERE date >= %s", (week_start,))
    week_count = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) as count FROM reports WHERE date >= %s", (month_start,))
    month_count = cur.fetchone()["count"]

    cur.execute("SELECT work_types FROM reports")
    rows = cur.fetchall()
    work_type_counts = {}
    for r in rows:
        for t in json.loads(r["work_types"] or "[]"):
            work_type_counts[t] = work_type_counts.get(t, 0) + 1

    thirty_days_ago = (datetime.date.today() - datetime.timedelta(days=29)).isoformat()
    cur.execute("""
        SELECT date, COUNT(*) as count FROM reports
        WHERE date >= %s GROUP BY date ORDER BY date
    """, (thirty_days_ago,))
    daily = [{"date": r["date"], "count": r["count"]} for r in cur.fetchall()]

    cur.execute("""
        SELECT project, COUNT(*) as count FROM reports
        GROUP BY project ORDER BY count DESC LIMIT 10
    """)
    by_project = [{"project": r["project"], "count": r["count"]} for r in cur.fetchall()]

    cur.execute("""
        SELECT site, COUNT(*) as count FROM reports
        GROUP BY site ORDER BY count DESC LIMIT 10
    """)
    by_site = [{"site": r["site"], "count": r["count"]} for r in cur.fetchall()]

    cur.close()
    conn.close()

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
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM reports ORDER BY date ASC, id ASC")
    rows = cur.fetchall()
    cur.close()
    conn.close()

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

    for r in rows:
        ws.append([
            r["date"],
            r["project"],
            r["site"],
            r["gps"],
            ", ".join(json.loads(r["work_types"] or "[]")),
            r["description"],
            r["quantity"],
            r["issues"],
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
