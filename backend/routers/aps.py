from fastapi import APIRouter, Depends
from models.schemas import SubjectMarks, CourseFilter
from services.aps_service import calculate_aps, get_qualifying_courses, get_improvement_suggestions
from routers.auth import get_current_user

router = APIRouter(prefix="/aps", tags=["APS Calculator"])


@router.post("/calculate")
def calculate(body: SubjectMarks, current_user=Depends(get_current_user)):
    result   = calculate_aps(body.subjects)
    courses  = get_qualifying_courses(result["aps_score"], body.subjects)
    return {**result, "qualifying_courses": courses, "total_courses": len(courses)}


@router.post("/courses")
def filter_courses(body: CourseFilter, current_user=Depends(get_current_user)):
    if body.aps_score is None:
        return {"error": "aps_score is required"}
    courses = get_qualifying_courses(body.aps_score, filters=body.dict(exclude_none=True))
    return {"courses": courses, "total": len(courses)}


@router.post("/suggest-improvements")
def suggest(body: SubjectMarks, course_name: str, current_user=Depends(get_current_user)):
    from database import courses_col
    course = courses_col.find_one({"name": {"$regex": course_name, "$options": "i"}}, {"_id": 0})
    if not course:
        return {"error": "Course not found"}
    suggestions = get_improvement_suggestions(body.subjects, course)
    return {"suggestions": suggestions, "target_course": course}
