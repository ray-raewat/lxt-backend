from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "LXT Backend Running"}
    from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ✅ แก้ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# root
@app.get("/")
def root():
    return {"message": "LXT Backend Running"}

# ✅ เพิ่ม endpoint นี้
@app.post("/reports")
def create_report(data: dict):
    print("📥 New Report:", data)
    return {"status": "success", "data": data}
