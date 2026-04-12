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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    return conn

def init_db():
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

init_db()

@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

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
