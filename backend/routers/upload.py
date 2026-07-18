from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from database import uploads_col
from services.ocr_service import process_upload
from routers.auth import get_current_user
from datetime import datetime
from bson import ObjectId
import os, shutil

router = APIRouter(prefix="/upload", tags=["Document Upload"])
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {"pdf", "jpg", "jpeg", "png", "webp"}


@router.post("/report-card")
async def upload_report(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, "Unsupported file type. Upload PDF, JPG, or PNG.")

    # Save file locally
    uid      = str(ObjectId())
    save_path = os.path.join(UPLOAD_DIR, f"{uid}.{ext}")
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Run OCR
    result = process_upload(save_path, file.filename)

    if "error" in result:
        os.remove(save_path)
        raise HTTPException(400, result["error"])

    # Store in DB
    doc = {
        "_id":               uid,
        "user_id":           str(current_user["_id"]),
        "filename":          file.filename,
        "detected_subjects": result["detected_subjects"],
        "confidence":        result["confidence"],
        "needs_review":      result["needs_review"],
        "uploaded_at":       datetime.utcnow(),
    }
    uploads_col.insert_one(doc)

    return {
        "upload_id":         uid,
        "detected_subjects": result["detected_subjects"],
        "confidence":        result["confidence"],
        "needs_review":      result["needs_review"],
        "message":           "Report card processed successfully" if not result["needs_review"]
                             else "Some subjects may not have been detected correctly. Please review and correct if needed."
    }


@router.get("/history")
def upload_history(current_user=Depends(get_current_user)):
    uploads = list(uploads_col.find(
        {"user_id": str(current_user["_id"])},
        {"_id": 1, "filename": 1, "uploaded_at": 1, "confidence": 1}
    ).sort("uploaded_at", -1).limit(10))
    for u in uploads:
        u["upload_id"] = u.pop("_id")
        u["uploaded_at"] = u["uploaded_at"].isoformat()
    return {"uploads": uploads}
