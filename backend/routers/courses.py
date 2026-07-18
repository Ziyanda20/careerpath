from fastapi import APIRouter, Depends, Query
from database import courses_col
from routers.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("/")
def list_courses(
    aps: Optional[int]    = Query(None, description="Filter by minimum APS"),
    faculty: Optional[str]= Query(None),
    institution: Optional[str] = Query(None),
    province: Optional[str]    = Query(None),
    type: Optional[str]        = Query(None, description="university or tvet"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    current_user=Depends(get_current_user)
):
    query = {}
    if aps is not None:
        query["min_aps"] = {"$lte": aps}
    if faculty:
        query["faculty"] = {"$regex": faculty, "$options": "i"}
    if institution:
        query["institution"] = {"$regex": institution, "$options": "i"}
    if province:
        query["province"] = {"$regex": province, "$options": "i"}
    if type:
        query["institution_type"] = type

    total   = courses_col.count_documents(query)
    skip    = (page - 1) * limit
    courses = list(courses_col.find(query, {"_id": 0}).skip(skip).limit(limit))

    return {"courses": courses, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/faculties")
def get_faculties(current_user=Depends(get_current_user)):
    faculties = courses_col.distinct("faculty")
    return {"faculties": sorted(faculties)}


@router.get("/institutions")
def get_institutions(current_user=Depends(get_current_user)):
    institutions = courses_col.distinct("institution")
    return {"institutions": sorted(institutions)}


@router.get("/{course_name}")
def get_course(course_name: str, current_user=Depends(get_current_user)):
    course = courses_col.find_one(
        {"name": {"$regex": course_name, "$options": "i"}},
        {"_id": 0}
    )
    if not course:
        return {"error": "Course not found"}
    return course
