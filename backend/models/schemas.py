from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    grade: str  # "11", "12", "gap_year"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    grade: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str


# ── APS ───────────────────────────────────────────────────────────────────────
class SubjectMarks(BaseModel):
    subjects: Dict[str, float]   # {"Mathematics": 75, "English": 68, ...}

class APSResult(BaseModel):
    aps_score: int
    subject_points: Dict[str, int]
    qualifying_courses: List[dict]


# ── Upload ────────────────────────────────────────────────────────────────────
class UploadResult(BaseModel):
    upload_id: str
    extracted_text: str
    detected_subjects: Dict[str, float]
    confidence: float
    needs_review: bool


# ── Course ────────────────────────────────────────────────────────────────────
class CourseFilter(BaseModel):
    aps_score: Optional[int] = None
    faculty: Optional[str] = None
    institution: Optional[str] = None
    institution_type: Optional[str] = None  # "university" | "tvet"
    province: Optional[str] = None


# ── Chatbot ───────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    aps_score: Optional[int] = None


# ── Grade 11 Tracking ────────────────────────────────────────────────────────
class TermResult(BaseModel):
    term: int          # 1, 2, 3, 4
    year: int
    subjects: Dict[str, float]
