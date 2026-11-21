import re
from database import courses_col

# Common career words/phrases a learner might use in chat, mapped to:
#   (display name, [course name substrings to match in the course catalog])
# Ordered so more specific phrases are checked before broad fallbacks
# (e.g. "civil engineer" before the generic "engineer").
CAREER_KEYWORDS = [
    (["doctor", "medicine", "medical doctor", "physician", "surgeon"], "Doctor", ["MBChB"]),
    (["pharmacist", "pharmacy"], "Pharmacist", ["BPharm"]),
    (["nurse", "nursing"], "Nurse", ["BSc Nursing"]),
    (["physiotherapist", "physiotherapy"], "Physiotherapist", ["BSc Physiotherapy"]),
    (["dietician", "dietitian", "nutritionist"], "Dietician", ["BSc Dietetics"]),
    (["vet", "veterinary", "veterinarian"], "Veterinarian", ["BVSc"]),
    (["civil engineer"], "Civil Engineer", ["BSc Civil Engineering", "National Diploma: Civil Engineering", "N4–N6 Civil Engineering"]),
    (["mechanical engineer"], "Mechanical Engineer", ["BSc Mechanical Engineering"]),
    (["electrical engineer"], "Electrical Engineer", ["BSc Electrical Engineering", "National Diploma: Electrical Engineering", "N4–N6 Electrical Engineering"]),
    (["chemical engineer"], "Chemical Engineer", ["BEng Chemical Engineering"]),
    (["computer engineer"], "Computer Engineer", ["BEng Computer Engineering"]),
    (["engineer", "engineering"], "Engineer", ["BSc Civil Engineering", "BSc Mechanical Engineering", "BSc Electrical Engineering"]),
    (["software developer", "programmer", "coder", "software engineer", "app developer"], "Software Developer", ["BSc Computer Science", "BEng Computer Engineering"]),
    (["computer scientist", "computer science"], "Computer Scientist", ["BSc Computer Science"]),
    (["it specialist", "information technology"], "IT Specialist", ["BSc Information Technology"]),
    (["data scientist", "data science", "data analyst"], "Data Scientist", ["BSc Data Science"]),
    (["actuary", "actuarial"], "Actuary", ["BSc Actuarial Science"]),
    (["mathematician"], "Mathematician", ["BSc Mathematics"]),
    (["environmental scientist"], "Environmental Scientist", ["BSc Environmental Science"]),
    (["chartered accountant", "accountant", "accounting", "ca(sa)"], "Accountant", ["BCom Accounting"]),
    (["financial analyst", "banker", "finance"], "Finance Professional", ["BCom Finance"]),
    (["economist"], "Economist", ["BCom Economics"]),
    (["business manager", "business management"], "Business Manager", ["BCom Business Management", "BBA (Business Administration)"]),
    (["entrepreneur", "business owner"], "Entrepreneur", ["BBA (Business Administration)", "Diploma: Business Management"]),
    (["lawyer", "attorney", "advocate"], "Lawyer", ["LLB"]),
    (["social worker"], "Social Worker", ["BA Social Work"]),
    (["psychologist", "psychology"], "Psychologist", ["BA Psychology"]),
    (["journalist", "communications", "public relations"], "Communications Professional", ["BA Communication"]),
    (["teacher", "teaching", "educator"], "Teacher", ["BA Education", "BEd Foundation Phase"]),
    (["artist", "fine art"], "Artist", ["BA Fine Arts"]),
    (["graphic designer", "graphic design"], "Graphic Designer", ["BDes Graphic Design"]),
    (["fashion designer", "fashion design"], "Fashion Designer", ["Diploma: Fashion Design"]),
    (["interior designer", "interior architect"], "Interior Designer", ["BDes Interior Architecture"]),
    (["farmer", "agriculture", "agricultural scientist"], "Agricultural Scientist", ["BSc Agriculture"]),
    (["chef", "hospitality", "catering", "hotel management"], "Hospitality Professional", ["N4–N6 Hospitality & Catering"]),
    (["beautician", "cosmetology", "hairdresser"], "Beauty Therapist", ["National Certificate: Cosmetology"]),
]


def extract_career_goal(history: list):
    """
    Scan a learner's chat messages (newest first) for a stated career
    interest. Returns (display_name, [matching course name substrings])
    or (None, []) if nothing was mentioned.
    """
    for msg in history:
        if msg.get("role") != "user":
            continue
        text = msg.get("content", "").lower()
        for phrases, display_name, course_matches in CAREER_KEYWORDS:
            for phrase in phrases:
                if re.search(r"\b" + re.escape(phrase) + r"\b", text):
                    return display_name, course_matches
    return None, []


def mark_to_level(mark: float) -> int:
    """SA achievement level (1-7) for a percentage."""
    for cut, lvl in ((80, 7), (70, 6), (60, 5), (50, 4), (40, 3), (30, 2)):
        if mark >= cut:
            return lvl
    return 1


def _display_names(alt_names) -> str:
    alt_names = [alt_names] if isinstance(alt_names, str) else alt_names
    return " or ".join(n.title() for n in alt_names)


def get_career_fit(subjects: dict, career: str, course_name_matches: list) -> dict:
    """
    Compare the learner's current subjects/marks against the requirements
    of their stated career goal and report, subject by subject, whether they
    meet it, are below it (and by how many points) or do not take it at all.
    """
    from services.aps_service import (calculate_aps, build_subject_lookup,
                                      find_subject_mark, normalise_subject)

    # Match by name prefix: the career table says "MBChB" but the catalog stores
    # "MBChB (Medicine)", "BPharm (Pharmacy)", "LLB (Bachelor of Laws)", etc.
    candidates = list(courses_col.find(
        {"$or": [{"name": {"$regex": "^" + re.escape(m), "$options": "i"}}
                 for m in course_name_matches]},
        {"_id": 0}
    ))
    if not candidates:
        return {"career": career, "target_course": None}

    # Use the most achievable matching course (lowest APS bar) as the
    # representative target for advice.
    target = min(candidates, key=lambda c: c.get("min_aps", 0))

    current_aps = calculate_aps(subjects)["aps_score"]
    required_aps = target.get("min_aps", 0)
    lookup = build_subject_lookup(subjects)

    subject_status = []
    for req in target.get("compulsory_subjects", []):
        alt_names = req.get("subject", "")
        min_mark = req.get("min_mark", 0)
        key, mark = find_subject_mark(lookup, alt_names)
        has_subject = mark is not None
        single = isinstance(alt_names, str) or len(alt_names) == 1
        display = _display_names(alt_names) if single else (key if has_subject else _display_names(alt_names))
        req_level = mark_to_level(min_mark)
        if not has_subject:
            status, gap = "missing", None
            advice = (f"You do not take {display}. {career} needs it (at least {min_mark}%, "
                      f"Level {req_level}), so you cannot be admitted for {target['name']} without it.")
            if normalise_subject(display) == "mathematics" and "mathematical literacy" in lookup:
                advice += " Mathematical Literacy does not count as Mathematics."
        elif mark < min_mark:
            status, gap = "below", int(round(min_mark - mark))
            advice = (f"{display}: {int(round(mark))}% (Level {mark_to_level(mark)}). {career} needs at least "
                      f"{min_mark}% (Level {req_level}) - improve by {gap} percentage points.")
        else:
            status, gap = "meets", 0
            advice = (f"{display}: {int(round(mark))}% (Level {mark_to_level(mark)}) - meets the "
                      f"{min_mark}% (Level {req_level}) requirement.")
        subject_status.append({
            "subject":       display,
            "subject_key":   key,                       # exact key in the learner's marks
            "current_mark":  mark,
            "current_level": mark_to_level(mark) if has_subject else None,
            "required_mark": min_mark,
            "required_level": req_level,
            "gap":           gap if gap is not None else min_mark,
            "has_subject":   has_subject,
            "status":        status,
            "at_risk":       status != "meets",
            "advice":        advice,
        })

    qualifies = current_aps >= required_aps and all(s["status"] == "meets" for s in subject_status)

    # How the learner stands against every programme that leads to this career
    options = []
    for c in sorted(candidates, key=lambda c: c.get("min_aps", 0)):
        ok = current_aps >= c.get("min_aps", 0)
        for r in c.get("compulsory_subjects", []):
            _, m = find_subject_mark(lookup, r.get("subject", ""))
            if m is None or m < r.get("min_mark", 0):
                ok = False
        options.append({"name": c["name"], "institution": c.get("institution"),
                        "min_aps": c.get("min_aps", 0), "qualifies": ok})

    return {
        "career":         career,
        "target_course": {
            "name":        target["name"],
            "institution": target.get("institution"),
        },
        "current_aps":    current_aps,
        "required_aps":   required_aps,
        "aps_gap":        max(0, required_aps - current_aps),
        "subject_status": subject_status,
        "missing_subjects": [s["subject"] for s in subject_status if s["status"] == "missing"],
        "weak_subjects":    [s["subject"] for s in subject_status if s["status"] == "below"],
        "options":        options[:8],
        "qualifies":      qualifies,
    }