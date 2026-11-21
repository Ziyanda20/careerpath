import re
from database import courses_col

# Subject names reach us in different spellings: the report-card reader gives
# "Physical Sciences", the progress-page picker gives
# "Physical Sciences (Physics and Chemistry)", course data uses lowercase.
# Everything is compared in one normalised form so they all match.
_SUBJECT_ALIASES = {
    "maths": "mathematics", "math": "mathematics",
    "physical science": "physical sciences", "life science": "life sciences",
    "english hl": "english home language", "english fal": "english first additional language",
    "english 1st additional language": "english first additional language",
    "lo": "life orientation",
}


def normalise_subject(name: str) -> str:
    n = re.sub(r"\(.*?\)", " ", str(name).lower())      # drop "(Physics and Chemistry)", "(IT)"
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return _SUBJECT_ALIASES.get(n, n)


def build_subject_lookup(subjects: dict) -> dict:
    """{normalised name: (name as stored, mark)}"""
    return {normalise_subject(k): (k, float(v)) for k, v in (subjects or {}).items()}


def find_subject_mark(lookup: dict, alt_names):
    """Best (stored_name, mark) among acceptable alternatives, or (None, None)."""
    alt_names = [alt_names] if isinstance(alt_names, str) else alt_names
    best = (None, None)
    for name in alt_names:
        hit = lookup.get(normalise_subject(name))
        if hit and (best[1] is None or hit[1] > best[1]):
            best = hit
    return best



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
    lo_keys = {"life orientation"}
    points = {}
    total  = 0

    for subject, mark in subjects.items():
        pts = mark_to_points(float(mark))
        points[subject] = pts
        if normalise_subject(subject) not in lo_keys:
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
        lookup = build_subject_lookup(subjects)
        filtered = []
        for c in courses:
            reqs = c.get("compulsory_subjects", [])
            passes = True
            for req in reqs:
                # A requirement's subject can be a single name, or a list of
                # acceptable alternatives (e.g. English Home Language OR
                # English First Additional Language) - either satisfies it.
                min_mark = req.get("min_mark", 0)
                _, mark = find_subject_mark(lookup, req.get("subject", ""))
                # Missing every alternative entirely also fails the requirement -
                # not just having it below the required mark.
                if mark is None or mark < min_mark:
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