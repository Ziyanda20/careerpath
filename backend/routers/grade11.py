from fastapi import APIRouter, Depends
from database import tracking_col
from models.schemas import TermResult
from services.aps_service import calculate_aps, get_qualifying_courses
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/grade11", tags=["Grade 11 Tracking"])


@router.post("/term-result")
def save_term(body: TermResult, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    aps     = calculate_aps(body.subjects)

    doc = {
        "user_id":   user_id,
        "term":      body.term,
        "year":      body.year,
        "subjects":  body.subjects,
        "aps_score": aps["aps_score"],
        "saved_at":  datetime.utcnow(),
    }
    # Upsert — replace existing record for same term/year
    tracking_col.replace_one(
        {"user_id": user_id, "term": body.term, "year": body.year},
        doc,
        upsert=True
    )
    return {"message": "Term result saved", "aps_score": aps["aps_score"]}


@router.get("/progress")
def get_progress(current_user=Depends(get_current_user)):
    docs = list(tracking_col.find(
        {"user_id": str(current_user["_id"])},
        {"_id": 0, "user_id": 0}
    ).sort([("year", 1), ("term", 1)]))
    for d in docs:
        d["saved_at"] = d["saved_at"].isoformat()
    return {"terms": docs}


@router.post("/what-if")
def what_if(body: dict, current_user=Depends(get_current_user)):
    """
    body = {"subjects": {"Mathematics": 75, ...}, "improvements": {"Mathematics": 10}}
    Returns new APS and newly qualifying courses.
    """
    subjects    = body.get("subjects", {})
    improvements = body.get("improvements", {})

    improved = {k: min(100, v + improvements.get(k, 0)) for k, v in subjects.items()}

    old_aps  = calculate_aps(subjects)["aps_score"]
    new_aps  = calculate_aps(improved)["aps_score"]
    new_courses = get_qualifying_courses(new_aps, improved)
    old_courses = get_qualifying_courses(old_aps, subjects)

    old_names = {c["name"] for c in old_courses}
    unlocked  = [c for c in new_courses if c["name"] not in old_names]

    return {
        "old_aps":          old_aps,
        "new_aps":          new_aps,
        "aps_gained":       new_aps - old_aps,
        "newly_unlocked":   unlocked,
        "total_unlocked":   len(unlocked),
    }
