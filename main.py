from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 🔓 Allow Frontend เรียก API ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📦 Temporary storage (เก็บใน RAM)
reports = []

# 🔹 Test API
@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

# 🔹 รับข้อมูลจาก Frontend
@app.post("/reports")
def create_report(data: dict):
    reports.append(data)
    return {
        "status": "success",
        "data_received": data
    }

# 🔹 ดูข้อมูลทั้งหมด
@app.get("/reports")
def get_reports():
    return {
        "total": len(reports),
        "data": reports
    }