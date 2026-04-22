import io
import json
import time
from pathlib import Path

import fitz
import requests
from PIL import Image



API_URL = "https://produces-authentic-simon-steady.trycloudflare.com"
FILE_PATH = "/Users/moojalgoot/Desktop/vvlm1/CNN.pdf"
OUTPUT_PATH = None
DPI = 200


# تحويل PDF إلى صور
def pdf_to_images(file_path: Path, dpi: int = 200):
    images = []

    print(" فتح ملف PDF...")
    doc = fitz.open(file_path)

    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)

    total_pages = len(doc)
    print(f"📑 عدد الصفحات المكتشفة: {total_pages}")

    for i in range(total_pages):
        print(f" تحويل الصفحة {i+1}/{total_pages} إلى صورة...")
        page = doc[i]
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        images.append(img)

    doc.close()
    print("اكتمل تحويل PDF إلى صور")
    return images


# تحويل صورة PIL إلى bytes
def pil_to_bytes(img: Image.Image) -> bytes:
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


# إرسال صفحة واحدة
def send_page_to_api(img: Image.Image, page_num: int, api_url: str) -> dict:
    print(f"جاري إرسال الصفحة {page_num} إلى السيرفر...")

    img_bytes = pil_to_bytes(img)

    files = {
        "file": (f"page_{page_num}.png", img_bytes, "image/png")
    }

    start = time.time()

    response = requests.post(
        f"{api_url.rstrip('/')}/extract",
        files=files,
        timeout=600
    )

    elapsed = round(time.time() - start, 2)

    if response.status_code != 200:
        try:
            error_json = response.json()
            return {
                "success": False,
                "error": error_json.get("error", f"HTTP {response.status_code}"),
                "page": page_num
            }
        except Exception:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "page": page_num
            }

    result = response.json()
    print(f"تم استلام الصفحة {page_num} ({elapsed}ث)")
    return result


# ===============================
# الدالة الرئيسية
# ===============================
def extract_contract(file_path: str, api_url: str, dpi: int = 200) -> dict:
    start_total = time.time()

    print("بدء التنفيذ...")
    file_path = Path(file_path)

    print("التحقق من الملف...")
    if not file_path.exists():
        return {
            "success": False,
            "error": f"الملف غير موجود: {file_path}"
        }

    file_size = round(file_path.stat().st_size / (1024 * 1024), 2)
    print(f" الملف موجود: {file_path.name}")
    print(f" حجم الملف: {file_size} MB")

    ext = file_path.suffix.lower()
    supported_images = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

    if ext == ".pdf":
        images = pdf_to_images(file_path, dpi=dpi)
        file_type = "pdf"
    elif ext in supported_images:
        print(" الملف صورة واحدة")
        img = Image.open(file_path).convert("RGB")
        images = [img]
        file_type = "image"
    else:
        return {
            "success": False,
            "error": f"نوع الملف غير مدعوم: {ext}"
        }

    page_results = []
    full_text_parts = []

    print(" بدء الإرسال صفحة صفحة...")

    for i, img in enumerate(images, start=1):
        result = send_page_to_api(img, i, api_url)

        if not result.get("success"):
            print(f" فشل في الصفحة {i}")
            print(result.get("error"))
            return result

        pages = result.get("pages", [])
        page_text = ""

        if pages:
            page_text = pages[0].get("text", "")
        else:
            page_text = result.get("full_text", "")

        word_count = len(page_text.split())
        print(f" الصفحة {i} انتهت | {word_count} كلمة")

        page_results.append({
            "page": i,
            "text": page_text,
            "word_count": word_count
        })

        full_text_parts.append(page_text)

    full_text = "\n\n".join(full_text_parts).strip()
    total_words = len(full_text.split())
    total_time = round(time.time() - start_total, 2)

    print(" اكتمل استخراج جميع الصفحات")
    print(f" عدد الصفحات: {len(images)}")
    print(f" عدد الكلمات: {total_words}")
    print(f"الوقت الكلي: {total_time}ث")

    return {
        "success": True,
        "file": str(file_path),
        "file_type": file_type,
        "page_count": len(images),
        "total_words": total_words,
        "total_time_seconds": total_time,
        "full_text": full_text,
        "pages": page_results
    }


# تشغيل مباشر
result = extract_contract(FILE_PATH, API_URL, dpi=DPI)

if not result.get("success"):
    print("\nفشل التنفيذ")
    print(result.get("error"))
    raise SystemExit()

full_text = result.get("full_text", "")

print("\n" + "=" * 60)
print("النص المستخرج:")
print("=" * 60)
print(full_text[:5000])

print("\nحفظ النتيجة...")

if OUTPUT_PATH is None:
    output_path = str(Path(FILE_PATH).with_suffix(".extracted.json"))
else:
    output_path = OUTPUT_PATH

Path(output_path).write_text(
    json.dumps(result, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print(f"تم حفظ النتيجة في: {output_path}")
# extract_contract.py
# --------------------
# الواجهة الرئيسية — استخدمه مباشرة من الـ terminal

# استخدام:
#     python extract_contract.py --file عقد.pdf --token hf_xxx
#     python extract_contract.py --file عقد.png --token hf_xxx
#     python extract_contract.py --file عقد.pdf --mode local  # مع GPU
# """

# import argparse
# import json
# import os
# import sys
# import time
# from pathlib import Path


# def main():
#     parser = argparse.ArgumentParser(
#         description="مستخرج نص العقود باستخدام Qwen2.5-VL",
#         formatter_class=argparse.RawTextHelpFormatter
#     )
#     parser.add_argument("--file", required=True, help="مسار ملف العقد (PDF أو صورة)")
#     parser.add_argument(
#         "--mode", default="api", choices=["api", "local"],
#         help="api = HF Inference API (بدون GPU)\nlocal = تشغيل محلي (يحتاج GPU)"
#     )
#     parser.add_argument("--token", default=None, help="HF Token (أو ضعه في HF_TOKEN)")
#     parser.add_argument(
#         "--model", default="Qwen/Qwen2.5-VL-7B-Instruct",
#         help="اسم المودل على HuggingFace"
#     )
#     parser.add_argument("--dpi", type=int, default=200, help="دقة تحويل PDF→صورة (افتراضي: 200)")
#     parser.add_argument("--4bit", action="store_true", dest="use_4bit",
#                         help="تفعيل 4-bit quantization للتشغيل المحلي بـ VRAM أقل")
#     parser.add_argument("--output", default=None, help="حفظ النتيجة في ملف JSON")
#     parser.add_argument("--text-only", action="store_true", help="طباعة النص فقط بدون JSON")

#     args = parser.parse_args()

#     # ── التحقق من الملف ──
#     file_path = Path(args.file)
#     if not file_path.exists():
#         print(f"❌ الملف غير موجود: {file_path}")
#         sys.exit(1)

#     ext = file_path.suffix.lower()
#     supported = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp"}
#     if ext not in supported:
#         print(f"❌ نوع الملف غير مدعوم: {ext}")
#         print(f"   الأنواع المدعومة: {', '.join(supported)}")
#         sys.exit(1)

#     print(f"\n{'═' * 55}")
#     print(f"  📄 مستخرج نص العقود — Qwen2.5-VL")
#     print(f"{'═' * 55}")
#     print(f"  الملف : {file_path.name}")
#     print(f"  الوضع : {args.mode}")
#     print(f"  المودل: {args.model}")
#     print(f"{'═' * 55}\n")

#     # ── الخطوة 1: تحميل الملف وتحويله لصور ──
#     from app.pdf_to_images import file_to_images

#     print("⏳ تحويل الملف إلى صور...")
#     file_bytes = file_path.read_bytes()
#     result = file_to_images(file_bytes, file_path.name, dpi=args.dpi)

#     if not result["success"]:
#         print(f"❌ فشل تحويل الملف: {result['error']}")
#         sys.exit(1)

#     images = result["images"]
#     print(f"✅ {len(images)} {'صفحة' if result['file_type'] == 'pdf' else 'صورة'} جاهزة للمعالجة\n")

#     # ── الخطوة 2: تحميل المستخرج ──
#     from app.vlm_extractor import ContractVLMExtractor

#     extractor = ContractVLMExtractor(
#         mode=args.mode,
#         model_id=args.model,
#         hf_token=args.token or os.environ.get("HF_TOKEN"),
#         use_4bit=args.use_4bit,
#     )

#     # ── الخطوة 3: الاستخراج ──
#     print("⏳ استخراج النص...\n")
#     extraction = extractor.extract_from_images(images, verbose=True)

#     if not extraction["success"]:
#         print(f"\n❌ فشل الاستخراج: {extraction['error']}")
#         sys.exit(1)

#     # ── الخطوة 4: النتيجة ──
#     output_data = {
#         "file": str(file_path),
#         "file_type": result["file_type"],
#         "page_count": extraction["page_count"],
#         "total_words": extraction["total_words"],
#         "total_time_seconds": extraction["total_time"],
#         "model": args.model,
#         "full_text": extraction["full_text"],
#         "pages": extraction["pages"],
#     }

#     print(f"\n{'═' * 55}")
#     print(f"  النص المستخرج ({extraction['total_words']} كلمة)")
#     print(f"{'═' * 55}")

#     if args.text_only:
#         print(extraction["full_text"])
#     else:
#         # طباعة أول 1000 حرف معاينة
#         preview = extraction["full_text"][:1000]
#         if len(extraction["full_text"]) > 1000:
#             preview += f"\n\n... [{extraction['total_words'] - len(preview.split())} كلمة إضافية]"
#         print(preview)

#     # ── حفظ النتيجة ──
#     if args.output:
#         out_path = Path(args.output)
#         out_path.write_text(json.dumps(output_data, ensure_ascii=False, indent=2))
#         print(f"\n💾 النتيجة محفوظة: {out_path}")
#     else:
#         # حفظ تلقائي بجانب الملف الأصلي
#         auto_out = file_path.with_suffix(".extracted.json")
#         auto_out.write_text(json.dumps(output_data, ensure_ascii=False, indent=2))
#         print(f"\n💾 النتيجة محفوظة تلقائياً: {auto_out}")

#     print(f"\n✅ اكتمل في {extraction['total_time']}ث")


# # ────────────────────────────────────────────────────────────
# # استخدام كـ library مباشرة (بدون terminal)
# # ────────────────────────────────────────────────────────────

# def extract_contract(
#     file_path: str,
#     hf_token: str = None,
#     mode: str = "api",
#     model_id: str = "Qwen/Qwen2.5-VL-7B-Instruct",
#     dpi: int = 200,
#     use_4bit: bool = False,
# ) -> dict:
#     """
#     دالة مباشرة للاستخدام من كود Python آخر

#     مثال:
#         from extract_contract import extract_contract

#         result = extract_contract(
#             file_path="عقد.pdf",
#             hf_token="hf_xxx",
#             mode="api"
#         )
#         print(result["full_text"])
#     """
#     from pathlib import Path
#     from app.pdf_to_images import file_to_images
#     from app.vlm_extractor import ContractVLMExtractor

#     file_path = Path(file_path)
#     file_bytes = file_path.read_bytes()

#     # تحويل لصور
#     images_result = file_to_images(file_bytes, file_path.name, dpi=dpi)
#     if not images_result["success"]:
#         return {"success": False, "error": images_result["error"]}

#     # استخراج
#     extractor = ContractVLMExtractor(
#         mode=mode,
#         model_id=model_id,
#         hf_token=hf_token or os.environ.get("HF_TOKEN"),
#         use_4bit=use_4bit,
#     )

#     return extractor.extract_from_images(images_result["images"], verbose=True)


# if __name__ == "__main__":
#     main()