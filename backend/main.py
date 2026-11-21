import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routers import auth, aps, upload, chatbot, grade11, courses
from routers import grade12

app = FastAPI(
    title="CareerPath SA API",
    description="AI-powered career guidance for South African learners",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS","http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(aps.router)
app.include_router(upload.router)
app.include_router(chatbot.router)
app.include_router(grade11.router)
app.include_router(grade12.router)
app.include_router(courses.router)

@app.on_event("startup")
def startup():
    create_indexes()
    print("✅ CareerPath SA API running — http://localhost:8000")
    print("📚 API docs — http://localhost:8000/docs")

@app.get("/")
def root():
    return {"message": "CareerPath SA API is running", "docs": "/docs"}