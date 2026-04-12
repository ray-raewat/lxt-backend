from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

reports = []

@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

@app.post("/reports")
def create_report(data: dict):
    if "date" not in data:
        data["date"] = datetime.date.today().isoformat()
    reports.append(data)
    return {"status": "success"}

@app.get("/reports")
def get_reports():
    return {
        "total": len(reports),
        "data": reports
    }

@app.delete("/reports")
def clear_reports():
    reports.clear()
    return {"status": "cleared"}

@app.get("/export")
def export_excel():
    wb = Workbook()
    ws = wb.active
    ws.title = "LXT Daily Report"

    headers = [
        "Date", "Project", "Site", "GPS",
        "Work Type", "Description",
        "Quantity", "Issues"
    ]

    # Header style
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)

    ws.append(headers)
    for col, cell in enumerate(ws[1], 1):
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Column widths
    col_widths = [12, 25, 15, 20, 20, 40, 15, 30]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width

    # Data rows
    for r in reports:
        ws.append([
            r.get("date", ""),
            r.get("project", ""),
            r.get("site", ""),
            r.get("gps", ""),
            ", ".join(r.get("workTypes", [])),
            r.get("description", ""),
            r.get("quantity", ""),
            r.get("issues", ""),
        ])

    # Freeze header row
    ws.freeze_panes = "A2"

    filename = f"LXT_Report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"
    wb.save(filepath)

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
