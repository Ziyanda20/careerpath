from database import courses_col


def mark_to_points(mark: float) -> int:
    """Convert a percentage mark to APS points (standard SA scale)."""
    if mark >= 80: return 7
    if mark >= 70: return 6
    if mark >= 60: return 5
    if mark >= 50: return 4
    if mark >= 40: return 3
    if mark >= 30: return 2
    return 1


def calculate_aps(subjects: dict) -> dict:
    """
    subjects: {"Mathematics": 75, "English Home Language": 62, ...}
    Returns aps_score and per-subject points.
    Life Orientation is excluded from APS (capped at 6 subjects for some unis,
    but we calculate the full sum here and let the matching handle per-uni rules).
    """
    lo_keys = {"life orientation", "lo"}
    points = {}
    total  = 0

    for subject, mark in subjects.items():
        pts = mark_to_points(float(mark))
        points[subject] = pts
        if subject.lower().strip() not in lo_keys:
            total += pts

    return {"aps_score": total, "subject_points": points}


def get_qualifying_courses(aps_score: int, subjects: dict = None, filters: dict = None) -> list:
    """
    Query MongoDB for all courses whose min_aps <= aps_score.
    Optionally filter by faculty, institution, province, type.
    Optionally check compulsory subject requirements.
    """
    query = {"min_aps": {"$lte": aps_score}}

    if filters:
        if filters.get("faculty"):
            query["faculty"] = {"$regex": filters["faculty"], "$options": "i"}
        if filters.get("institution"):
            query["institution"] = {"$regex": filters["institution"], "$options": "i"}
        if filters.get("institution_type"):
            query["institution_type"] = filters["institution_type"]
        if filters.get("province"):
            query["province"] = {"$regex": filters["province"], "$options": "i"}

    courses = list(courses_col.find(query, {"_id": 0}).sort("min_aps", -1).limit(200))

    # Check compulsory subject requirements if marks provided
    if subjects:
        subject_lower = {k.lower(): v for k, v in subjects.items()}
        filtered = []
        for c in courses:
            reqs = c.get("compulsory_subjects", [])
            passes = True
            for req in reqs:
                subj_name = req.get("subject", "").lower()
                min_mark  = req.get("min_mark", 0)
                learner_mark = subject_lower.get(subj_name)
                if learner_mark is not None and learner_mark < min_mark:
                    passes = False
                    break
            if passes:
                filtered.append(c)
        return filtered

    return courses


def get_improvement_suggestions(subjects: dict, target_course: dict) -> list:
    """
    Given a learner's current marks and a target course they don't yet qualify for,
    suggest which subjects to improve and by how much.
    """
    current_aps = calculate_aps(subjects)["aps_score"]
    needed_aps  = target_course.get("min_aps", 0)
    gap         = needed_aps - current_aps

    if gap <= 0:
        return []

    suggestions = []
    for subject, mark in sorted(subjects.items(), key=lambda x: x[1]):
        current_pts = mark_to_points(mark)
        if current_pts < 7:
            next_threshold = next(
                (t for t in [30, 40, 50, 60, 70, 80] if t > mark), None
            )
            if next_threshold:
                new_pts = mark_to_points(next_threshold)
                gain    = new_pts - current_pts
                suggestions.append({
                    "subject":       subject,
                    "current_mark":  mark,
                    "current_points": current_pts,
                    "improve_to":    next_threshold,
                    "new_points":    new_pts,
                    "aps_gain":      gain
                })

    suggestions.sort(key=lambda x: x["aps_gain"], reverse=True)
    return suggestions[:5]
