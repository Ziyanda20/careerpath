from fastapi import APIRouter, Depends
from database import tracking_col, chat_col
from services.aps_service import calculate_aps, get_qualifying_courses, normalise_subject
from services.career_service import extract_career_goal, get_career_fit
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/grade12", tags=["Grade 12 Tracking"])

@router.post("/term-result")
def save_term(body: dict, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    subjects = body.get("subjects", {})
    term = body.get("term", 1)
    year = body.get("year", 2026)
    aps = calculate_aps(subjects)
    doc = {
        "user_id": user_id,
        "term": term,
        "year": year,
        "subjects": subjects,
        "aps_score": aps["aps_score"],
        "saved_at": datetime.utcnow(),
    }
    tracking_col.replace_one(
        {"user_id": user_id, "term": term, "year": year},
        doc, upsert=True
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

@router.post("/career-fit")
def career_fit(body: dict = None, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    body = body or {}

    subjects = body.get("subjects")
    if not subjects:
        docs = list(tracking_col.find({"user_id": user_id}).sort([("year", 1), ("term", 1)]))
        if not docs:
            return {"career": None}
        subjects = docs[-1]["subjects"]

    history = list(chat_col.find(
        {"user_id": user_id}, {"role": 1, "content": 1, "_id": 0}
    ).sort("timestamp", -1).limit(30))

    career, course_matches = extract_career_goal(history)
    if not career:
        return {"career": None}

    return get_career_fit(subjects, career, course_matches)

@router.post("/what-if")
def what_if(body: dict, current_user=Depends(get_current_user)):
    subjects = body.get("subjects", {})
    improvements = body.get("improvements", {})
    wanted = {normalise_subject(k): v for k, v in improvements.items()}
    improved = {k: min(100, v + wanted.get(normalise_subject(k), 0)) for k, v in subjects.items()}
    old_aps = calculate_aps(subjects)["aps_score"]
    new_aps = calculate_aps(improved)["aps_score"]
    new_courses = get_qualifying_courses(new_aps, improved)
    old_courses = get_qualifying_courses(old_aps, subjects)
    old_names = {c["name"] for c in old_courses}
    unlocked = [c for c in new_courses if c["name"] not in old_names]
    return {
        "old_aps": old_aps,
        "new_aps": new_aps,
        "aps_gained": new_aps - old_aps,
        "newly_unlocked": unlocked,
        "total_unlocked": len(unlocked)
    }