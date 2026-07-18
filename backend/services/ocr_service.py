import pytesseract
from PIL import Image
from dotenv import load_dotenv
import os, re, fitz  # fitz = PyMuPDF for PDFs

load_dotenv()

tess_path = os.getenv("TESSERACT_PATH", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.path.exists(tess_path):
    pytesseract.pytesseract.tesseract_cmd = tess_path

# SA subject name patterns
SUBJECT_PATTERNS = [
    r"mathematics\s*(hl|sl|extended|literacy)?",
    r"english\s*(home language|first additional|fal|hl)?",
    r"afrikaans\s*(home language|first additional|fal|hl)?",
    r"isizulu|isixhosa|sesotho|setswana|sepedi|xitsonga|tshivenda|siswati|isindebele",
    r"physical\s*sciences?",
    r"life\s*sciences?",
    r"accounting",
    r"business\s*studies",
    r"economics",
    r"geography",
    r"history",
    r"life\s*orientation",
    r"computer\s*applications?\s*technology|cat",
    r"information\s*technology|it",
    r"dramatic\s*arts?",
    r"visual\s*arts?",
    r"music",
    r"consumer\s*studies",
    r"engineering\s*graphics\s*(and\s*design)?|egd",
    r"agricultural\s*(sciences?|technology|management)?",
    r"tourism",
    r"hospitality\s*studies",
    r"religion\s*studies",
]


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


def parse_subjects_from_text(text: str) -> dict:
    """
    Parse subject names and percentage marks from raw OCR text.
    Returns dict: {"Mathematics": 75.0, ...}
    Confidence heuristic: percentage of lines that matched a known subject.
    """
    subjects  = {}
    lines     = text.split("\n")
    matched   = 0

    # Pattern: "Mathematics 75" or "Mathematics: 75%" or "Mathematics  75  Level 6"
    mark_re = re.compile(
        r"([A-Za-z][A-Za-z\s]{2,40}?)\s*[:\-]?\s*(\d{1,3})\s*%?", re.IGNORECASE
    )

    for line in lines:
        line = line.strip()
        if not line:
            continue

        m = mark_re.search(line)
        if not m:
            continue

        raw_subject = m.group(1).strip()
        raw_mark    = float(m.group(2))

        if raw_mark > 100 or raw_mark < 0:
            continue

        # Check if it matches a known SA subject
        is_known = any(
            re.search(pat, raw_subject, re.IGNORECASE)
            for pat in SUBJECT_PATTERNS
        )
        if is_known:
            subjects[raw_subject.title()] = raw_mark
            matched += 1

    total_lines = max(len([l for l in lines if l.strip()]), 1)
    confidence  = round(matched / total_lines, 2)

    return subjects, confidence


def process_upload(file_path: str, filename: str) -> dict:
    ext = filename.lower().split(".")[-1]

    if ext == "pdf":
        text = extract_text_from_pdf(file_path)
    elif ext in ["jpg", "jpeg", "png", "webp"]:
        text = extract_text_from_image(file_path)
    else:
        return {"error": "Unsupported file type. Please upload PDF, JPG, or PNG."}

    subjects, confidence = parse_subjects_from_text(text)
    needs_review = confidence < 0.3 or len(subjects) < 3

    return {
        "extracted_text":    text,
        "detected_subjects": subjects,
        "confidence":        confidence,
        "needs_review":      needs_review,
    }
