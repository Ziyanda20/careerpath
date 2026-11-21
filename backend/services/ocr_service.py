import pytesseract
from PIL import Image
from dotenv import load_dotenv
from difflib import SequenceMatcher
import os, re, pymupdf as fitz

load_dotenv()

tess_path = os.getenv("TESSERACT_PATH", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.path.exists(tess_path):
    pytesseract.pytesseract.tesseract_cmd = tess_path

# SA subject name patterns, each paired with a canonical display name.
# The canonical name — not the raw OCR text — is what gets stored, so a
# messy OCR read like "I Physical Sciences Ay" still lands cleanly under
# "Physical Sciences" and correctly matches course requirements downstream.
SUBJECT_PATTERNS = [
    (r"mathematical\s*literacy", "Mathematical Literacy"),
    (r"mathematics\s*(hl|sl|extended)?", "Mathematics"),
    (r"english\s*home\s*language", "English Home Language"),
    (r"english\s*(first|1st)\s*add(itional)?|english\s*fal", "English First Additional Language"),
    (r"english\s*hl", "English Home Language"),
    (r"english(?!\s*(home|first|1st|fal|hl))", "English Home Language"),
    (r"afrikaans\s*home\s*language", "Afrikaans Home Language"),
    (r"afrikaans\s*(first|1st)\s*add(itional)?|afrikaans\s*fal", "Afrikaans First Additional Language"),
    (r"afrikaans(?!\s*(home|first|1st|fal))", "Afrikaans Home Language"),
    (r"(isi)?zulu", "IsiZulu"),
    (r"(isi)?xhosa", "IsiXhosa"),
    (r"(se)?sotho(?!\s*sa)", "Sesotho"),
    (r"(se)?tswana", "Setswana"),
    (r"sepedi", "Sepedi"),
    (r"(xi)?tsonga", "Xitsonga"),
    (r"(tshi)?venda", "Tshivenda"),
    (r"siswati", "Siswati"),
    (r"(isi)?ndebele", "IsiNdebele"),
    (r"physical\s*sciences?", "Physical Sciences"),
    (r"life\s*sciences?", "Life Sciences"),
    (r"accounting", "Accounting"),
    (r"business\s*studies", "Business Studies"),
    (r"economics", "Economics"),
    (r"geography", "Geography"),
    (r"history", "History"),
    (r"life\s*orientation", "Life Orientation"),
    (r"computer\s*applications?\s*technology|\bcat\b", "Computer Applications Technology"),
    (r"information\s*technology|\bit\b", "Information Technology"),
    (r"dramatic\s*arts?", "Dramatic Arts"),
    (r"visual\s*arts?", "Visual Arts"),
    (r"music", "Music"),
    (r"consumer\s*studies", "Consumer Studies"),
    (r"engineering\s*graphics\s*(and\s*design)?|\begd\b", "Engineering Graphics and Design"),
    (r"agricultural\s*(sciences?|technology|management)?", "Agricultural Sciences"),
    (r"tourism", "Tourism"),
    (r"hospitality\s*studies", "Hospitality Studies"),
    (r"religion\s*studies", "Religion Studies"),
]


def match_subject(raw: str, threshold: float = 0.82):
    """Canonical subject name for raw OCR text, tolerating small OCR typos (e.g. 'STUOIES')."""
    raw = re.sub(r"[^A-Za-z0-9 ]", " ", raw)          # drop stray table-border characters like |
    raw = re.sub(r"\s+", " ", raw).strip()
    for pat, canonical in SUBJECT_PATTERNS:
        if re.search(pat, raw, re.IGNORECASE):
            return canonical
    cleaned = re.sub(r"[^a-z ]", "", raw.lower()).strip()
    if len(cleaned) < 5:
        return None
    best, best_score = None, 0.0
    for canonical in dict.fromkeys(c for _, c in SUBJECT_PATTERNS):
        score = SequenceMatcher(None, cleaned, canonical.lower()).ratio()
        if score > best_score:
            best, best_score = canonical, score
    return best if best_score >= threshold else None


def extract_text_from_image(image_path: str) -> str:
    img  = Image.open(image_path).convert("RGB")
    # Upscale small images for better OCR
    w, h = img.size
    if w < 1000:
        img = img.resize((w * 2, h * 2), Image.LANCZOS)
    config = "--psm 6 --oem 3"
    return pytesseract.image_to_string(img, config=config)


def extract_text_from_pdf(pdf_path: str) -> str:
    doc  = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    if len(text.strip()) < 100:          # scanned PDF — fallback to OCR
        for page in doc:
            pix  = page.get_pixmap(dpi=200)
            img  = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text += pytesseract.image_to_string(img, config="--psm 6")
    return text



# Lines above the "Subjects" heading (name, ID number, exam number, school, etc.)
# should never be scanned for marks. If no heading is found, we fall back to
# scanning the whole document so older/differently-formatted certificates
# still work.
SUBJECTS_HEADING_RE = re.compile(r"^\s*subjects?\b", re.IGNORECASE)

# Extra safety net: even below the heading, never treat these detail lines as subjects.
NON_SUBJECT_LINE_RE = re.compile(
    r"identity\s*number|id\s*no\.?|id\s*number|examination\s*number|exam\s*no\.?|"
    r"candidate\s*number|centre\s*number|date\s*of\s*birth|"
    r"gender|school\s*name|surname|full\s*names?",
    re.IGNORECASE,
)

# Matches column headers like "Term 1", "Term 2", "T1", "T2" so we know how
# many mark columns a report card has and which term each one belongs to.
# Also accepts "C1", "C2", "C3" (cycle / continuous-assessment columns, which
# some schools use instead of "Term"), plus "Cycle 1" / "Quarter 1", and common
# OCR misreads of the digit 1 as the letter l or I (e.g. "Cl", "CI").
TERM_HEADER_RE = re.compile(
    r"\b(?:t(?:erm)?|c(?:ycle)?|q(?:uarter)?)\s*([1-4]|[lI](?![A-Za-z]))(?![0-9A-Za-z])",
    re.IGNORECASE,
)


def _term_number(token: str) -> int:
    """Convert the captured digit (or an OCR-misread 'l'/'I') to a term number."""
    return 1 if token in ("l", "I", "L", "i") else int(token)


def detect_term_order(text: str) -> list:
    """
    Scan the document for 'Term 1' / 'Term 2' (or 'T1' / 'T2', or 'C1' / 'C2' /
    'C3') style column headers and return the term numbers in the order their columns appear,
    e.g. [1, 2] for a Term 2 progress report that also shows Term 1 marks.
    Returns [] if no term headers are found — i.e. a single-term document
    like a final NSC certificate.
    """
    seen = []
    for m in TERM_HEADER_RE.finditer(text):
        t = _term_number(m.group(1))
        if t not in seen:
            seen.append(t)
        if len(seen) >= 4:
            break
    return seen


# ---------------------------------------------------------------------------
# Learner vs class-average columns
# Many report cards print the learner's own mark next to the class (or grade)
# average. Only the learner's mark must be read. We work out the column layout
# from the header words, e.g. "Learner  Class Avg" or "C1 Learner Class C2 ...".
# ---------------------------------------------------------------------------
COLUMN_TOKEN_RE = re.compile(
    r"\b(?P<term>(?:t(?:erm)?|c(?:ycle)?|q(?:uarter)?)\s*(?:[1-4]|[lI])(?![0-9A-Za-z]))"
    r"|\b(?P<learner>learner|student|pupil|marks?|results?|score)\b"
    r"|\b(?P<avg>class|average|avg|mean|median|grade)\b",
    re.IGNORECASE,
)
NUMBER_RE = re.compile(r"(?<![\w.])\d{1,3}(?:\.\d+)?(?![\w.])")


def _find_first_subject_line(lines):
    for i, l in enumerate(lines):
        if NON_SUBJECT_LINE_RE.search(l):
            continue
        if NUMBER_RE.search(l) and any(re.search(p, l, re.IGNORECASE) for p, _ in SUBJECT_PATTERNS):
            return i
    return None


def detect_column_layout(lines, heading_idx):
    """
    Read the header words above the first subject row and return the ordered
    column list [(term_or_None, "learner"|"avg"), ...], or None when the
    report has no class/average column (so the original logic is used).
    """
    first = _find_first_subject_line(lines)
    if first is None:
        return None
    start = heading_idx if heading_idx is not None else max(0, first - 8)
    header = " ".join(lines[start:first])
    tokens = []
    for m in COLUMN_TOKEN_RE.finditer(header):
        if m.group("term"):
            digit = re.search(r"([1-4]|[lI])\s*$", m.group("term")).group(1)
            tokens.append(("term", 1 if digit in "lI" else int(digit)))
        elif m.group("learner"):
            tokens.append(("role", "learner"))
        else:
            tokens.append(("role", "avg"))
    n_terms = sum(1 for k, _ in tokens if k == "term")
    n_roles = sum(1 for k, _ in tokens if k == "role")
    if not any(v == "avg" for k, v in tokens if k == "role"):
        return None                                   # no class-average column
    cols, cur_term, cur_role = [], None, "learner"
    for kind, val in tokens:
        if kind == "term":
            cur_term = val
            if n_terms > n_roles:                     # "Learner C1 C2 Class C1 C2"
                cols.append((cur_term, cur_role))
        else:
            cur_role = val
            if n_roles >= n_terms:                    # "C1 Learner Class C2 ..." or "Learner Class"
                cols.append((cur_term, cur_role))
    if not any(r == "learner" for _, r in cols) or len(cols) < 2:
        return None
    return cols


def parse_with_columns(scan_lines, cols):
    """Parse subject rows using a learner/class column layout; keep learner marks only."""
    learner_cols = [(i, t) for i, (t, r) in enumerate(cols) if r == "learner"]
    terms, subject_confidence, matched = {}, {}, 0
    for line in scan_lines:
        line = line.strip()
        if not line or NON_SUBJECT_LINE_RE.search(line):
            continue
        first_num = NUMBER_RE.search(line)
        if not first_num:
            continue
        raw_subject = re.sub(r"[:\-]+$", "", line[:first_num.start()]).strip()
        nums = [float(x) for x in NUMBER_RE.findall(line[first_num.start():])]
        if len(raw_subject) < 3 or len(nums) < len(cols):
            continue
        subject_name = next((c for p, c in SUBJECT_PATTERNS
                             if re.search(p, raw_subject, re.IGNORECASE)), None)
        if subject_name is None:
            continue
        picked = [(t, nums[i]) for i, t in learner_cols]
        if any(m < 0 or m > 100 for _, m in picked):
            continue
        conf = round(SequenceMatcher(None, raw_subject.lower(), subject_name.lower()).ratio(), 3)
        for t, m in picked:
            key = t if t is not None else 1
            terms.setdefault(key, {})[subject_name] = m
            subject_confidence.setdefault(key, {})[subject_name] = conf
        matched += 1
    return terms, subject_confidence, matched


def parse_subjects_from_text(text: str) -> dict:
    """
    Parse subject names and mark(s) from raw OCR text.

    Some report cards (Term 2 onward) list each subject with two mark
    columns side by side — the current term's mark next to the previous
    term's mark. This function detects that layout from 'Term 1' / 'Term 2'
    style headers and splits marks into the correct term buckets, instead
    of blending them into one set of marks.

    Returns (subjects, confidence, terms):
      - subjects:   flat dict for the LATEST detected term, e.g. {"Mathematics": 75.0, ...}
                     (kept for backward compatibility with single-term callers)
      - confidence: percentage of lines that matched a known subject
      - terms:      {term_number: {subject: mark}} for every term column found.
                     Has just one entry, matching `subjects`, when only a
                     single mark column was detected.
    """
    lines = text.split("\n")

    heading_idx = next(
        (i for i, l in enumerate(lines) if SUBJECTS_HEADING_RE.match(l.strip())),
        None,
    )
    scan_lines = lines[heading_idx + 1:] if heading_idx is not None else lines

    # Report cards that print a class/grade average beside the learner's mark:
    # read the learner column only and ignore the class column.
    layout = detect_column_layout(lines, heading_idx)
    if layout:
        terms, subject_confidence, matched = parse_with_columns(scan_lines, layout)
        if matched:
            total_lines = max(len([l for l in scan_lines if l.strip()]), 1)
            latest = max(terms.keys())
            return (
                terms[latest],
                round(matched / total_lines, 2),
                {str(k): v for k, v in terms.items()},
                {str(k): v for k, v in subject_confidence.items()},
            )

    term_order = detect_term_order(text)
    num_cols = len(term_order) if len(term_order) >= 2 else 1

    # Pattern: subject name followed by `num_cols` mark values, e.g.
    # "Mathematics  65  71" for a two-column (Term 1 / Term 2) layout, or
    # "Mathematics 75" / "Mathematics: 75%" for a single-column layout.
    mark_re = re.compile(
        r"([A-Za-z][A-Za-z\s]{2,40}?)\s*[:\-]?\s*"
        + r"\s+".join([r"(\d{1,3})\s*%?"] * num_cols),
        re.IGNORECASE,
    )

    terms = {t: {} for t in term_order} if num_cols > 1 else {}
    # Per-subject read confidence, purely for the review UI — never used in
    # any APS/course calculation, only to flag rows worth double-checking.
    subject_confidence = {t: {} for t in term_order} if num_cols > 1 else {}
    matched = 0

    for line in scan_lines:
        line = line.strip()
        if not line:
            continue

        if NON_SUBJECT_LINE_RE.search(line):
            continue

        m = mark_re.search(line)
        if not m:
            continue

        raw_subject = m.group(1).strip()
        raw_marks   = [float(g) for g in m.groups()[1:]]

        if any(mk > 100 or mk < 0 for mk in raw_marks):
            continue

        # Match against a known SA subject and use its canonical name —
        # never the raw OCR text, which can pick up stray characters
        # (e.g. "I Physical Sciences Ay") that would otherwise silently
        # fail to match this exact subject in course requirements later.
        subject_name = next(
            (canonical for pat, canonical in SUBJECT_PATTERNS
             if re.search(pat, raw_subject, re.IGNORECASE)),
            None,
        )
        if subject_name is None:
            continue

        # How closely the raw OCR text matched the canonical name — a clean
        # read scores near 1.0, stray characters ("I Physical Sciences Ay")
        # pull it down, flagging the row as worth a manual check.
        row_confidence = round(
            SequenceMatcher(None, raw_subject.lower(), subject_name.lower()).ratio(), 3
        )

        if num_cols > 1:
            for term_num, mk in zip(term_order, raw_marks):
                terms[term_num][subject_name] = mk
                subject_confidence[term_num][subject_name] = row_confidence
        else:
            term_key = term_order[0] if term_order else 1
            terms.setdefault(term_key, {})[subject_name] = raw_marks[0]
            subject_confidence.setdefault(term_key, {})[subject_name] = row_confidence
        matched += 1

    total_lines = max(len([l for l in scan_lines if l.strip()]), 1)
    confidence  = round(matched / total_lines, 2)

    latest_term = max(terms.keys()) if terms else None
    subjects = terms.get(latest_term, {})

    # MongoDB (BSON) documents require string keys, and JSON object keys are
    # strings anyway — convert term numbers to strings here, at the boundary,
    # so callers never have to worry about it.
    terms = {str(k): v for k, v in terms.items()}
    subject_confidence = {str(k): v for k, v in subject_confidence.items()}

    return subjects, confidence, terms, subject_confidence


# ---------------------------------------------------------------------------
# Grid-style report cards (ruled table: C1 / C2 / C3 groups, each with
# LEARNER marks, a symbol (SMB) and GRADE marks).
# Plain line-by-line OCR scrambles these, so we:
#   1. erase the table's ruled lines (OpenCV, if installed),
#   2. read every word WITH its position,
#   3. find each term's LEARNER column (from the header, or from the layout of
#      the numbers if the header is unreadable),
#   4. re-read each learner mark cell on its own with a digits-only OCR pass.
# The class/grade columns and symbol columns are ignored.
# ---------------------------------------------------------------------------
def _runs(flags, max_thick):
    """(start, end) of consecutive True flags no thicker than max_thick."""
    out, start = [], None
    for i, v in enumerate(list(flags) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start <= max_thick:
                out.append((start, i))
            start = None
    return out


def _log(msg: str):
    print(f"[OCR] {msg}", flush=True)


def _remove_grid_lines_pil(img):
    """Pillow-only fallback: paint thin, long dark rows/columns (table rules) white."""
    try:
        from PIL import ImageDraw
        gray = img.convert("L")
        w, h = gray.size
        thick = max(int(w / 150), 4)
        row_mean = list(gray.resize((1, h), Image.BOX).getdata())
        h_lines = _runs([m < 150 for m in row_mean], thick)
        if len(h_lines) < 3:
            return img
        top, bottom = h_lines[0][0], h_lines[-1][1]
        band = gray.crop((0, top, w, bottom))
        col_mean = list(band.resize((w, 1), Image.BOX).getdata())
        v_lines = _runs([m < 120 for m in col_mean], thick)
        out = gray.copy()
        d = ImageDraw.Draw(out)
        pad = 1
        for a, b in h_lines:
            d.rectangle([0, max(a - pad, 0), w, b + pad], fill=255)
        for a, b in v_lines:
            d.rectangle([max(a - pad, 0), top, b + pad, bottom], fill=255)
        return out.convert("RGB")
    except Exception:
        return img


def _remove_grid_lines(img):
    """Erase table borders so they do not confuse OCR. Returns img unchanged if OpenCV is missing."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        print("[OCR] OpenCV is not installed - using the slower built-in line remover. "
              "For best accuracy run: pip install -r requirements.txt (inside the venv)")
        return _remove_grid_lines_pil(img)
    try:
        gray = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2GRAY)
        bw = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 31, 15)
        h, w = bw.shape
        hor = cv2.morphologyEx(bw, cv2.MORPH_OPEN,
                               cv2.getStructuringElement(cv2.MORPH_RECT, (max(w // 25, 20), 1)))
        ver = cv2.morphologyEx(bw, cv2.MORPH_OPEN,
                               cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(h // 60, 20))))
        lines = cv2.dilate(cv2.bitwise_or(hor, ver), np.ones((3, 3), np.uint8))
        out = gray.copy()
        out[lines > 0] = 255          # paint the ruled lines white, keep the digits' original shading
        return Image.fromarray(out).convert("RGB")
    except Exception:
        return img


def _ocr_words(img):
    d = pytesseract.image_to_data(img, config="--psm 11 --oem 3",
                                  output_type=pytesseract.Output.DICT)
    words = []
    for i, t in enumerate(d["text"]):
        t = (t or "").strip()
        if not t:
            continue
        try:
            conf = float(d["conf"][i])
        except (TypeError, ValueError):
            conf = 0.0
        words.append({"t": t, "conf": conf,
                      "x": d["left"][i] + d["width"][i] / 2.0,
                      "y": d["top"][i] + d["height"][i] / 2.0})
    return words


def _read_cell_digits(img, x, y, sc):
    """Digits-only OCR of one small cell. Returns a mark 0-100 or None."""
    try:
        box = (int(x - 38 * sc), int(y - 20 * sc), int(x + 38 * sc), int(y + 20 * sc))
        crop = img.crop(box).convert("L")
        try:                                  # remove short underlines (e.g. underlined marks)
            import cv2, numpy as np
            a = np.array(crop)
            inv = 255 - a
            ln = cv2.morphologyEx((inv > 110).astype("uint8") * 255, cv2.MORPH_OPEN,
                                  cv2.getStructuringElement(cv2.MORPH_RECT, (max(crop.width // 3, 8), 1)))
            a[cv2.dilate(ln, np.ones((3, 1), np.uint8)) > 0] = 255
            crop = Image.fromarray(a)
        except Exception:
            pass
        crop = crop.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)
        framed = Image.new("L", (crop.width + 40, crop.height + 40), 255)
        framed.paste(crop, (20, 20))
        for psm in ("7", "8"):
            txt = pytesseract.image_to_string(
                framed, config=f"--psm {psm} -c tessedit_char_whitelist=0123456789").strip()
            if re.fullmatch(r"\d{1,3}", txt) and 0 <= int(txt) <= 100:
                return float(txt)
    except Exception:
        pass
    return None


def _learner_columns_from_layout(nums):
    """Fallback when the header is unreadable: infer the learner columns from number positions."""
    if not nums:
        return []
    xs = sorted(n["x"] for n in nums)
    clusters, cur = [], [xs[0]]
    for x in xs[1:]:
        if x - cur[-1] > 30:
            clusters.append(cur); cur = []
        cur.append(x)
    clusters.append(cur)
    clusters = [c for c in clusters if len(c) >= 5]
    centres = [sum(c) / len(c) for c in clusters]
    # first column is usually TOT (value 100 on every row)
    if centres:
        tot = [n for n in nums if abs(n["x"] - centres[0]) < 30]
        if tot and sum(1 for n in tot if n["t"] == "100") >= 0.6 * len(tot):
            centres = centres[1:]
    if len(centres) >= 3 and len(centres) % 3 == 0:      # learner, symbol, grade
        return centres[0::3]
    if len(centres) >= 2 and len(centres) % 2 == 0:      # learner, grade
        return centres[0::2]
    return []


def _extend_columns(col_x, nums, sc):
    """
    A header word can be unreadable (e.g. one LEARNER label lost), which would
    silently drop a whole term. Term groups sit at an even spacing, so keep
    stepping right while numbers still line up in the next group's column.
    """
    col_x = sorted(col_x)
    if len(col_x) < 2:
        return col_x
    pitch = sorted(b - a for a, b in zip(col_x, col_x[1:]))[len(col_x) // 2 - 1 if len(col_x) > 2 else 0]
    while len(col_x) < 4:
        nx = col_x[-1] + pitch
        hits = [n for n in nums if abs(n["x"] - nx) < 40 * sc]
        if len({round(n["y"] / (12 * sc)) for n in hits}) >= 3:
            col_x.append(sum(n["x"] for n in hits) / len(hits))
        else:
            break
    return col_x


def _read_label_cell(img, y, x0, x1, sc):
    """OCR one subject-name cell on its own (used when the full-page read garbled it)."""
    try:
        crop = img.crop((int(x0), int(y - 18 * sc), int(x1), int(y + 18 * sc))).convert("L")
        crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
        framed = Image.new("L", (crop.width + 60, crop.height + 60), 255)
        framed.paste(crop, (30, 30))
        txt = pytesseract.image_to_string(framed, config="--psm 7 --oem 3").strip()
        return txt
    except Exception:
        return ""


_SKIP_ROW_WORDS = re.compile(r"best|total|average|promotion|position|symbol|subjects?\b", re.I)


def parse_report_table(img):
    """
    Returns (terms, subject_confidence, text, confidence) for grid report
    cards, or None if the image does not look like one (the normal text
    parser is then used).
    """
    img = img.convert("RGB")
    if img.width < 1200:
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
    sc = img.width / 1653.0
    img = _remove_grid_lines(img)
    words = _ocr_words(img)

    # --- learner column positions ---------------------------------------
    learner_hdr = sorted([w for w in words if re.fullmatch(r"learner", w["t"], re.I)],
                         key=lambda w: w["x"])
    col_x = []
    for hdr in learner_hdr:
        cands = [w for w in words
                 if w["t"].lower().startswith("marks")
                 and hdr["y"] + 10 * sc < w["y"] < hdr["y"] + 90 * sc
                 and 0 < hdr["x"] - w["x"] < 120 * sc]
        col_x.append(min(cands, key=lambda w: hdr["x"] - w["x"])["x"] if cands
                     else hdr["x"] - 46 * sc)
    header_y = max([h["y"] for h in learner_hdr], default=0)

    # --- subject rows (labels on the left) -------------------------------
    all_nums = [w for w in words if re.fullmatch(r"\d{1,3}", w["t"]) and int(w["t"]) <= 100]
    if len(col_x) < 2:                       # header unreadable: infer columns from the numbers
        col_x = _learner_columns_from_layout(all_nums)
    col_x = _extend_columns(col_x, all_nums, sc)   # header missed a term: step to the next column
    if len(col_x) < 2:
        _log(f"table: only {len(col_x)} learner column(s) found "
             f"({len(learner_hdr)} LEARNER header word(s), {len(all_nums)} numbers read)")
        return None
    label_limit = col_x[0] - 150 * sc
    top = header_y + 40 * sc if learner_hdr else 0
    labels = sorted([w for w in words if w["x"] < label_limit and w["y"] > top],
                    key=lambda w: (w["y"], w["x"]))
    lines, cur = [], []
    for w in labels:
        if cur and abs(w["y"] - cur[-1]["y"]) > 16 * sc:
            lines.append(cur); cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    rows = []
    for ln in lines:
        raw = " ".join(w["t"] for w in sorted(ln, key=lambda w: w["x"]))
        name = match_subject(raw)
        if name and not NON_SUBJECT_LINE_RE.search(raw):
            rows.append([name, sum(w["y"] for w in ln) / len(ln), raw])
    if len(rows) < 3:
        _log(f"table: only {len(rows)} subject row(s) recognised from {len(lines)} text lines")
        return None

    nums = [n for n in all_nums if n["x"] > label_limit]
    ys = sorted(r[1] for r in rows)
    gap = min([b - a for a, b in zip(ys, ys[1:]) if b - a > 5 * sc] or [34 * sc])
    row_tol = max(gap * 0.6, 14 * sc)
    col_tol = 40 * sc
    offsets = [n["y"] - r[1] for r in rows for n in nums
               if abs(n["y"] - r[1]) < row_tol and any(abs(n["x"] - cx) < col_tol for cx in col_x)]
    off = sorted(offsets)[len(offsets) // 2] if offsets else 0.0

    # --- recover subject rows whose NAME was garbled by OCR -----------------
    # A learner can take 9 subjects, and one unreadable label must not drop a
    # row. Any line of marks inside the subject block that has no recognised
    # name gets its name cell re-read on its own.
    if rows:
        ys_sorted = sorted(r[1] for r in rows)
        lo, hi = ys_sorted[0] - 1.5 * gap, ys_sorted[-1] + 1.5 * gap
        mark_ys = sorted(n["y"] - off for n in nums if lo <= n["y"] - off <= hi)
        groups, cur = [], []
        for y in mark_ys:
            if cur and y - cur[-1] > row_tol * 0.9:
                groups.append(cur); cur = []
            cur.append(y)
        if cur:
            groups.append(cur)
        for g in groups:
            if len(g) < 3:
                continue                                  # need several marks to count as a row
            gy = sum(g) / len(g)
            if any(abs(gy - r[1]) < row_tol for r in rows):
                continue                                  # already have this row
            raw = _read_label_cell(img, gy + off, 95 * sc, label_limit + 40 * sc, sc)
            if not raw or _SKIP_ROW_WORDS.search(raw):
                continue
            name = match_subject(raw, 0.62)
            if name and name not in {r[0] for r in rows}:
                rows.append([name, gy, raw])
                _log(f"table: recovered row '{raw}' as {name}")
        rows.sort(key=lambda r: r[1])

    # --- read the learner mark in every row/column -----------------------
    terms, conf_map, filled, expected = {}, {}, 0, 0
    seen_subjects = set()
    for name, ry, raw in rows:
        if name in seen_subjects:          # ignore repeated rows / footers
            continue
        seen_subjects.add(name)
        for gi, cx in enumerate(col_x):
            expected += 1
            hits = [n for n in nums
                    if abs(n["x"] - cx) < col_tol and abs(n["y"] - (ry + off)) < row_tol]
            page_mark = None
            if hits:
                best = min(hits, key=lambda n: abs(n["y"] - (ry + off)))
                page_mark = float(best["t"])
            cell_mark = _read_cell_digits(img, cx, ry + off, sc)
            if cell_mark is not None and page_mark is not None:
                if cell_mark == page_mark:
                    mark, c = cell_mark, 0.95
                else:                                            # disagreement -> flag for review
                    # a clipped cell read ("7" for "78") is a fragment of the page read
                    clipped = str(int(page_mark)).find(str(int(cell_mark))) >= 0 \
                        and len(str(int(cell_mark))) < len(str(int(page_mark)))
                    mark, c = (page_mark if clipped else cell_mark), 0.6
            elif cell_mark is not None:
                mark, c = cell_mark, 0.7
            elif page_mark is not None:
                mark, c = page_mark, 0.7
            else:
                continue
            filled += 1
            terms.setdefault(gi + 1, {})[name] = mark
            conf_map.setdefault(gi + 1, {})[name] = c

    if not terms or filled < 3:
        _log(f"table: only {filled} mark(s) read")
        return None
    _log(f"table: {len(rows)} subjects x {len(col_x)} learner columns, {filled} marks read")
    text = "\n".join(r[2] for r in rows)
    return (
        {str(k): v for k, v in terms.items()},
        {str(k): v for k, v in conf_map.items()},
        text,
        round(filled / max(expected, 1), 2),
    )


def _first_page_image(file_path: str, ext: str):
    """First page as a PIL image (PDF pages rendered at 200 dpi), or None."""
    try:
        if ext == "pdf":
            doc = fitz.open(file_path)
            pix = doc[0].get_pixmap(dpi=200)
            return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        return Image.open(file_path).convert("RGB")
    except Exception:
        return None


def process_upload(file_path: str, filename: str) -> dict:
    ext = filename.lower().split(".")[-1]

    if ext not in ("pdf", "jpg", "jpeg", "png", "webp"):
        return {"error": "Unsupported file type. Please upload PDF, JPG, or PNG."}

    # 1) Grid-style report cards (C1/C2/C3 columns with Learner and Grade marks):
    #    read by column position so only the learner's own marks are used.
    try:
        img = _first_page_image(file_path, ext)
        table = parse_report_table(img) if img is not None else None
    except Exception:
        import traceback
        _log("table parser crashed, falling back to text parsing:\n" + traceback.format_exc())
        table = None
    if table:
        terms, subject_confidence, text, confidence = table
        latest = max(terms.keys(), key=int)
        subjects = terms[latest]
        return {
            "extracted_text":      text,
            "detected_subjects":   subjects,
            "terms":               terms,
            "subject_confidence":  subject_confidence,
            "confidence":          confidence,
            "needs_review":        confidence < 0.6 or len(subjects) < 3,
        }

    # 2) Everything else: normal text-based parsing
    if ext == "pdf":
        text = extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_image(file_path)

    subjects, confidence, terms, subject_confidence = parse_subjects_from_text(text)
    needs_review = confidence < 0.3 or len(subjects) < 3

    return {
        "extracted_text":      text,
        "detected_subjects":   subjects,
        "terms":               terms,
        "subject_confidence":  subject_confidence,
        "confidence":          confidence,
        "needs_review":        needs_review,
    }