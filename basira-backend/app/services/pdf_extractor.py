import io
import time
import base64
import logging
import cv2
import fitz
import numpy as np
import requests
from PIL import Image
from fastapi import HTTPException
from app.core.config import settings

log = logging.getLogger(__name__)
MIN_CHARS_PER_PAGE = 50


def detect_issues(img_cv: np.ndarray) -> dict:
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    return {
        "too_dark":   float(np.mean(gray)) < 80,
        "too_bright": float(np.mean(gray)) > 200,
        "blurry":     float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 100,
        "brightness": float(np.mean(gray)),
        "sharpness":  float(cv2.Laplacian(gray, cv2.CV_64F).var()),
    }


def deskew(img_cv: np.ndarray) -> np.ndarray:
    gray  = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=100, minLineLength=100, maxLineGap=10
    )
    if lines is None:
        return img_cv
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 - x1 == 0:
            continue
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if -45 < angle < 45:
            angles.append(angle)
    if not angles:
        return img_cv
    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.3:
        return img_cv
    h, w = img_cv.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), median_angle, 1.0)
    rotated = cv2.warpAffine(
        img_cv, M, (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE
    )
    log.info(f"deskew: {median_angle:.2f} degrees")
    return rotated


def fix_lighting(img_cv: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return cv2.cvtColor(cv2.merge([clahe.apply(l), a, b]), cv2.COLOR_LAB2BGR)


def remove_noise(img_cv: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(img_cv, None, 6, 6, 7, 21)


def sharpen_text(img_cv: np.ndarray) -> np.ndarray:
    kernel = np.array([
        [0,   -0.5, 0  ],
        [-0.5, 3,  -0.5],
        [0,   -0.5, 0  ],
    ], dtype=np.float32)
    return cv2.filter2D(img_cv, -1, kernel)


def preprocess_image(pil_img: Image.Image, page_num: int) -> Image.Image:
    img_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    issues = detect_issues(img_cv)
    log.info(
        f"[P{page_num}] brightness={issues['brightness']:.0f} | "
        f"sharpness={issues['sharpness']:.0f} | "
        f"too_dark={issues['too_dark']} | "
        f"too_bright={issues['too_bright']} | "
        f"blurry={issues['blurry']}"
    )
    img_cv = deskew(img_cv)
    if issues["too_dark"] or issues["too_bright"]:
        img_cv = fix_lighting(img_cv)
        log.info("lighting fixed")
    img_cv = remove_noise(img_cv)
    img_cv = sharpen_text(img_cv)
    return Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))


def extract_with_pymupdf(pdf_bytes: bytes) -> tuple[str, int]:
    doc   = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for i in range(len(doc)):
        text = doc[i].get_text().strip()
        if text:
            pages.append(f"[page {i+1}]\n{text}")
    page_count = len(doc)
    doc.close()
    return "\n\n".join(pages), page_count


def pdf_to_pil_images(pdf_bytes: bytes, dpi: int = 200) -> list[Image.Image]:
    doc    = fitz.open(stream=pdf_bytes, filetype="pdf")
    zoom   = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)
    images = []
    for page_num in range(len(doc)):
        pix = doc[page_num].get_pixmap(matrix=matrix, alpha=False)
        images.append(
            Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        )
    doc.close()
    return images


def pil_to_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def extract_page_via_vlm(img: Image.Image, page_num: int, api_url: str) -> str:
    img_bytes = pil_to_bytes(img)
    try:
        resp = requests.post(
            f"{api_url.rstrip('/')}/extract",
            files={"file": (f"page_{page_num}.png", img_bytes, "image/png")},
            timeout=600,
        )
    except requests.exceptions.ConnectionError:
        raise HTTPException(503, f"Cannot connect to VLM API: {api_url}")
    except requests.exceptions.Timeout:
        raise HTTPException(504, f"VLM API timeout on page {page_num}")
    if resp.status_code != 200:
        raise HTTPException(502, f"VLM API error {resp.status_code} on page {page_num}")
    result = resp.json()
    if not result.get("success"):
        raise HTTPException(502, result.get("error", "VLM error"))
    pages = result.get("pages", [])
    return pages[0].get("text", "") if pages else result.get("full_text", "")



def extract_page_via_openai(img: Image.Image, page_num: int) -> str:

    PROMPT = PROMPT = """You are the world's most accurate OCR system, specialized in Arabic and English legal contracts from Saudi Arabia.

MISSION: Extract every single character visible in this image with zero errors.

EXTRACTION RULES:
1. Extract ALL visible text without exception:
   - Article numbers and clause numbers (المادة، البند، الفقرة)
   - Party names, dates, amounts, percentages
   - Headers, footers, page numbers
   - Stamps, watermarks, signatures labels
   - Handwritten notes or annotations
   - Tables with full structure

2. LAYOUT PRESERVATION:
   - Arabic: right-to-left 
   - English: left-to-right 
   - Mixed lines: preserve exact order
   - Paragraphs: preserve spacing with blank lines
   - Tables: use | to separate columns, — for rows

3. ABSOLUTE PROHIBITIONS:
   - Never summarize or paraphrase
   - Never translate any word
   - Never add explanations or comments
   - Never skip repeated text or watermarks
   - Never reorder or restructure content

4. QUALITY STANDARDS:
   - Numbers: extract exactly (١٢٣ stays ١٢٣, 123 stays 123)
   - Dates: exact format (١٤٤٥/٠١/١٥ or 15/01/2024)
   - Unclear text: [غير واضح] for Arabic, [unclear] for English

OUTPUT FORMAT:
Raw extracted text only.
No introduction, no conclusion, no metadata.
Start directly with the first word in the document."""

    img_bytes = pil_to_bytes(img)
    b64 = base64.b64encode(img_bytes).decode("utf-8")

    payload = {
        "model": "gpt-4o",
        "max_tokens": 4096,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "high"}},
            ],
        }],
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=120,
        )
    except requests.exceptions.Timeout:
        raise HTTPException(504, f"OpenAI timeout on page {page_num}")

    if resp.status_code != 200:
        raise HTTPException(502, f"OpenAI error {resp.status_code}: {resp.text[:200]}")

    return resp.json()["choices"][0]["message"]["content"].strip()


def extract_with_vlm(pdf_bytes: bytes, api_url: str) -> tuple[str, int]:
    images = pdf_to_pil_images(pdf_bytes)
    parts  = []
    for i, img in enumerate(images, start=1):
        log.info(f"VLM: processing page {i}/{len(images)}")
        img  = preprocess_image(img, page_num=i)
        text = extract_page_via_vlm(img, i, api_url)
        parts.append(text)
        time.sleep(0.5)
    return "\n\n".join(parts).strip(), len(images)


def extract_text_from_image(image_bytes: bytes) -> tuple[str, int, str]:
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = preprocess_image(pil_img, page_num=1)

    text = extract_page_via_openai(img, page_num=1)
    return text, 1, "openai"


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int, str]:

    log.info("PDF -> images -> GPT-4o Vision")
    images = pdf_to_pil_images(pdf_bytes)
    parts  = []
    for i, img in enumerate(images, start=1):
        log.info(f"GPT-4o: processing page {i}/{len(images)}")
        img  = preprocess_image(img, page_num=i)

        text = extract_page_via_openai(img, page_num=i)
        parts.append(text)
        time.sleep(0.3)
    return "\n\n".join(parts).strip(), len(images), "openai"