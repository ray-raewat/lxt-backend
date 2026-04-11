from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openpyxl import Workbook
import datetime

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage
reports = []

@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

@app.post("/reports")
def create_report(data: dict):
    reports.append(data)
    return {"status": "success"}

@app.get("/reports")
def get_reports():
    return {
        "total": len(reports),
        "data": reports
    }

# 🔥 EXPORT EXCEL
@app.get("/export")
def export_excel():
    wb = Workbook()
    ws = wb.active
    ws.title = "LXT Report"

    headers = [
        "Project", "Site", "GPS",
        "Work Type", "Description",
        "Quantity", "Issues"
    ]
    ws.append(headers)

    for r in reports:
        ws.append([
            r.get("project"),
            r.get("site"),
            r.get("gps"),
            ", ".join(r.get("workTypes", [])),
            r.get("description"),
            r.get("quantity"),
            r.get("issues"),
        ])

    filename = f"report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"
    wb.save(filepath)

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )