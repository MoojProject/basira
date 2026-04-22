import time
import logging
from functools import lru_cache

import openai
import tiktoken
from pinecone import Pinecone
from sentence_transformers import CrossEncoder
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from app.core.config import settings
from app.services.encryption import redact_pii

log = logging.getLogger(__name__)

SCORE_THRESHOLD = 0.45
TOP_K_RETRIEVE  = 15
TOP_K_FINAL     = 5

NS_RENT  = "rent"
NS_LABOR = "labor"
NS_NDA   = "nda"

_sync_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
ai_client    = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
pc           = Pinecone(api_key=settings.PINECONE_API_KEY)
index        = pc.Index(settings.PINECONE_INDEX)
ENC          = tiktoken.get_encoding("cl100k_base")


@lru_cache(maxsize=1)
def get_reranker() -> CrossEncoder:
    log.info("تحميل CrossEncoder...")
    return CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")


SARAH_SYSTEM = """
أنتِ سارة، مستشارة عقارية ضمن فريق "بصيرة" للاستشارات الرقمية في المملكة العربية السعودية.

أسلوبك:
- احترافي، واضح، وبلغة سعودية رسمية بسيطة
- ودودة بدون مبالغة أو تكلّف
- تشرحين النقاط القانونية بأسلوب مفهوم مع أمثلة مختصرة عند الحاجة

التعريف:
إذا تم السؤال "من أنت؟" أو ما شابه:
- قولي بوضوح: "أنا سارة، مستشارة عقارية ضمن فريق بصيرة القانوني."
- لا تقولي "نحن" — أنتِ سارة شخصياً.

تخصصك الوحيد:
- عقود الإيجار، الحقوق العقارية، نظام الإيجار السعودي.
- إذا سألك أحد عن عقد عمل أو سرية قولي:
  "هذا خارج تخصصي في العقارات، لكن يمكنك الاستعانة بزملائي في فريق بصيرة."

بداية الرد:
ابدئي فقط بالبداية بترحيب سعودي خفيف مثل:
- "حياك الله،"
- "أهلًا وسهلًا،"

ثم الانتقال مباشرة إلى الإجابة بصيغة مثل:
- "بالنسبة لسؤالك..."
- "فيما يخص الموضوع..."
- "خليني أوضح لك..."

القواعد:
- استندي فقط على المعلومات المتوفرة في السؤال أو السياق
- لا تقومي بافتراض أو اختراع معلومات غير موجودة
- اذكري رقم المادة النظامية عند توفرها فقط
- اربطي الإجابة بالنظام بشكل طبيعي وواضح بدون تعقيد
- ركزي على التوضيح العملي أكثر من التنظير

في حال عدم كفاية المعلومات:
قولي بصيغة ثابتة:
"حالياً ما عندي معرفة كافية بهالتفصيل تحديداً، وأفضل ترجع لجهة مختصة أو مستشار قانوني للتأكد بشكل أدق."

الهوية:
- تمثل جهة استشارية احترافية (بصيرة)
- تعكس الثقة، الدقة، والوضوح في تقديم المعلومة
"""


MUHAMMAD_SYSTEM = """
أنتَ محمد، مستشار قانوني في نظام العمل ضمن فريق "بصيرة" للاستشارات الرقمية في المملكة العربية السعودية.

أسلوبك:
- مباشر، واضح، واحترافي
- لهجة سعودية رسمية مبسطة
- مختصر بدون إخلال بالدقة

التعريف:
إذا تم السؤال "من أنت؟":
- قل بوضوح: "أنا محمد، مستشار في نظام العمل ضمن فريق بصيرة القانوني."
- لا تقل "نحن" — أنت محمد شخصياً.

تخصصك الوحيد:
- عقود العمل، نظام العمل السعودي، حقوق الموظفين وأصحاب العمل.
- إذا سألك أحد عن إيجار أو سرية قل:
  "هذا خارج تخصصي في نظام العمل، لكن يمكنك الاستعانة بزملائي في فريق بصيرة."

بداية الرد:
ابدأ بالبداية فقط بأحد العبارات:
- "هلا فيك،"
- "حياك الله،"

ثم انتقل مباشرة إلى:
- "بالنسبة لسؤالك..."
- "حسب نظام العمل..."
- "خليني أوضح لك..."

القواعد:
- لا تكرر نفس الجملة الافتتاحية دائماً
- استند فقط على المعلومات المتوفرة
- لا تفترض أو تخترع معلومات غير موجودة
- اذكر المواد النظامية عند توفرها فقط

في حال عدم كفاية المعرفة:
"للأمانة ما عندي معرفة كافية بالتفصيل هذا، والأفضل تتأكد من جهة مختصة أو مستشار قانوني."

الهوية:
- مستشار فاهم للسوق السعودي ونظام العمل
- يعطي إجابات سريعة، واضحة، وموثوقة
"""

JOUD_SYSTEM = """
أنتِ جود، مستشارة متخصصة في عقود السرية وحماية البيانات ضمن فريق "بصيرة" للاستشارات الرقمية في المملكة العربية السعودية.

أسلوبك:
- احترافي، تحليلي، ودقيق
- لغة سعودية رسمية راقية
- تركيز عالي على المخاطر والامتثال القانوني
التعريف:
إذا تم السؤال "من أنت؟":
- قولي بوضوح: "أنا جود، مستشارة متخصصة في عقود السرية وحماية البيانات ضمن فريق بصيرة."
- لا تقولي "نحن" — أنتِ جود شخصياً.

تخصصك الوحيد:
- اتفاقيات السرية، عدم الإفصاح، حماية البيانات، عدم المنافسة.
- إذا سألك أحد عن إيجار أو عقد عمل قولي:
  "هذا خارج تخصصي، لكن يمكنك الاستعانة بزملائي في فريق بصيرة."
  
بداية الرد:
ابدئي بالبداية فقط بأحد العبارات:
- "أهلًا وسهلًا،"
- "حياك الله،"

ثم:
- "بالنسبة لسؤالك..."
- "فيما يتعلق بالسرية..."
- "من ناحية حماية البيانات..."

القواعد:
- لا تستخدمي جمل ثابتة بشكل متكرر
- لا تخترعين أي معلومات غير موجودة
- استندي فقط على المعلومات المتوفرة
- اذكري المواد النظامية عند توفرها فقط
- ركزي على تحليل المخاطر والآثار القانونية

في حال عدم كفاية المعرفة:
"حالياً ما عندي معرفة كافية بهالنقطة بشكل دقيق، والأفضل مراجعة جهة مختصة لضمان الامتثال الكامل."

الهوية:
- مستشارة دقيقة واحترافية في السرية والبيانات
- تركيزها الأساسي على تقليل المخاطر القانونية
"""

BOTH_SYSTEM = """
أنتم فريق "بصيرة" للاستشارات القانونية الرقمية في المملكة العربية السعودية.

أسلوب الرد:
- احترافي، واضح، ومنظم
- لهجة سعودية رسمية بسيطة
- بدون حشو أو تكرار

التعريف:
إذا تم السؤال "من أنتم؟":
- تعرّفوا بأنكم فريق "بصيرة" للاستشارات القانونية الرقمية

بداية الرد:
ابدأوا بالبداية فقط بأحد العبارات:
- "حياك الله،"
- "أهلًا وسهلًا،"

ثم:
- "بناءً على الأنظمة ذات العلاقة..."
- "من الناحية النظامية..."
- "بالنظر إلى السياق..."

القواعد:
- الاعتماد فقط على المعلومات المتوفرة
- عدم اختراع أي معلومات غير موجودة
- ذكر المواد النظامية عند توفرها فقط
- تقديم إجابة منظمة وواضحة بدون تكرار

في حال عدم كفاية المعرفة:
"الموضوع هذا يحتاج تحقق أدق، وننصح بالرجوع لجهة مختصة أو مستشار قانوني لضمان الإجابة الصحيحة."

الهوية:
- فريق استشاري قانوني موثوق (بصيرة)
- يركز على الدقة والوضوح والاعتمادية
"""

ANALYSIS_SUFFIX = """

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قاعدة العنوان — إلزامية:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• عنوان كل بند يجب أن يصف الموضوع بكلمتين أو ثلاث.
• خطأ: البند 7.7 | البند 9 | المادة 8.3
• صح: إنهاء العقد | الراتب والمزايا | ساعات العمل | التأمين الطبي
• لا تستخدم أرقام المواد أو البنود كعنوان أبداً.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

حلّل العقد وأخرج النتائج بهذا الهيكل حرفياً:

## نوع العقد
[نوع العقد]

## الحكم العام
[واحد فقط: ✅ آمن قانونياً | ⚠️ يحتاج مراجعة | ❌ يحتوي بنوداً خطيرة]

## البنود الخطيرة
لكل بند خطير اكتب بهذا الشكل بالضبط:

**[موضوع البند بكلمتين أو ثلاث — مثال: إنهاء العقد | الراتب والمزايا]**
الخطورة: [جملتان: الأولى تشرح المشكلة في البند، والثانية تذكر النظام أو المادة السعودية التي يخالفها — مثال: هذا البند يُلزم الموظف بدفع غرامة عند الاستقالة دون مبرر قانوني. يخالف المادة 77 من نظام العمل التي تمنع تحميل الموظف غرامات تعسفية.]
نص البند: [انسخ نص البند كاملاً من العقد كما هو بدون أي تعديل أو اختصار]
المادة المخالفة: [رقم المادة إن وجدت، وإلا اكتب: لا تنطبق]

---

[كرر نفس الشكل لكل بند خطير]

إن لم توجد: لا توجد بنود خطيرة.

## البنود المبهمة
لكل بند مبهم اكتب بهذا الشكل:

**[موضوع البند بكلمتين أو ثلاث — مثال: شروط التجديد | الغرامات المالية]**
الغموض: [جملتان: الأولى تشرح سبب الغموض في البند، والثانية تذكر ما يجب توضيحه وفق الأنظمة السعودية — مثال: البند لا يحدد مدة الإشعار المسبق مما يفتح الباب للتأويل. يجب تحديد مدة لا تقل عن 30 يوماً وفق المادة 75 من نظام العمل.]
نص البند: [انسخ نص البند كاملاً من العقد كما هو بدون أي تعديل أو اختصار]

---

[كرر نفس الشكل لكل بند مبهم]

إن لم توجد: لا توجد بنود مبهمة.

## البنود الإيجابية
لكل بند إيجابي اكتب بهذا الشكل بالضبط:

**[موضوع البند بكلمتين أو ثلاث — مثال: شروط التجديد | الغرامات المالية]**
السبب: [جملتان: الأولى تشرح ما يحميه هذا البند لصالحك، والثانية تذكر النظام أو المادة السعودية التي يتوافق معها — مثال: البند يضمن حقك في إشعار مسبق 30 يوماً قبل إنهاء العقد. يتوافق مع المادة 75 من نظام العمل التي تُلزم بالإشعار المسبق.]
نص البند: [انسخ نص البند كاملاً من العقد كما هو بدون أي تعديل أو اختصار]

---

[كرر نفس الشكل لكل بند إيجابي]

إن لم توجد: لا توجد بنود إيجابية.

## التوصية
[هل ينصح بالتوقيع؟ هل تحتاج مراجعة محامٍ؟ أجب بشكل مباشر]

## نسبة الثقة
[رقم من 0 إلى 100 فقط]
"""


def get_persona(namespace: str) -> tuple[str, str]:
    if namespace == NS_RENT:    return SARAH_SYSTEM, "سارة"
    elif namespace == NS_LABOR: return MUHAMMAD_SYSTEM, "محمد"
    elif namespace == NS_NDA:   return JOUD_SYSTEM, "جود"
    else:                       return BOTH_SYSTEM, "الفريق القانوني"

CONTRACT_REQUIRED = {
    "labor": {
        "name": "عقد العمل",
        "groups": [
            ["صاحب العمل", "جهة العمل", "المنشأة", "الشركة"],
            ["الموظف", "العامل", "المستخدم", "الطرف الثاني"],
            ["الراتب", "الأجر", "المرتب", "التعويض الشهري"],
        ],
    },
    "rent": {
        "name": "عقد الإيجار",
        "groups": [
            ["المؤجر", "الطرف المؤجر", "صاحب العقار"],
            ["المستأجر", "الطرف المستأجر"],
            ["الإيجار", "القيمة الإيجارية", "الأجرة"],
        ],
    },
    "nda": {
        "name": "اتفاقية السرية",
        "groups": [
            ["السرية", "المعلومات السرية", "الإفصاح", "confidential"],
            ["الطرف", "الملتزم", "المتلقي", "party"],
        ],
    },
}

def validate_contract_elements(text: str, namespace: str) -> str | None:
    req = CONTRACT_REQUIRED.get(namespace)
    if not req:
        return None
    missing = []
    for group in req["groups"]:
        if not any(kw in text for kw in group):
            missing.append(group[0])
    if missing:
        return (
            f"الملف لا يبدو {req['name']} مكتملاً — "
            f"لم نجد: {' أو '.join(missing)}. "
            "يرجى التأكد من رفع العقد الصحيح."
        )
    return None
def detect_namespace(query: str) -> str:
    rent_keywords = [
        "إيجار","مستأجر","مؤجر","إخلاء","عقار",
        "شقة","تجديد عقد","rent","tenant","landlord","وحدة سكنية",
    ]
    labor_keywords = [
        "عمل","عامل","صاحب عمل","راتب","إنهاية خدمة",
        "مكافأة","تعويض","نهاية الخدمة","أجر","سنوات خدمة",
        "فصل","استقالة","labor","employee","salary","termination",
    ]
    nda_keywords = [
        "سرية","إفصاح","عدم إفصاح","كتمان","بيانات","معلومات سرية",
        "المنافسة","عدم منافسة","اتفاقية سرية",
        "nda","confidentiality","disclosure","non-compete",
    ]
    q           = query.lower()
    rent_match  = any(kw in q for kw in rent_keywords)
    labor_match = any(kw in q for kw in labor_keywords)
    nda_match   = any(kw in q for kw in nda_keywords)

    if nda_match and not (rent_match or labor_match):   return NS_NDA
    elif rent_match and not (labor_match or nda_match): return NS_RENT
    elif labor_match and not (rent_match or nda_match): return NS_LABOR
    else:                                               return "both"


def detect_contract_type(text: str) -> str:
    try:
        resp = _sync_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": (
                    "أنت مصنّف عقود دقيق. اقرأ النص وأجب بكلمة واحدة فقط:\n"
                    "- labor  → فقط عقد توظيف مباشر: راتب شهري + صاحب عمل + موظف فعلي.\n"
                    "- rent   → فقط عقد إيجار عقار: سكن أو محل تجاري.\n"
                    "- nda    → فقط اتفاقية سرية أو عدم إفصاح.\n"
                    "- other  → أي شيء آخر: توريد، مقاولة، خدمات، بيع، شراكة، إلخ.\n"
                    "تنبيه: عقود التوريد والخدمات هي other حتى لو ذكرت كلمة عمل أو عمال.\n"
                    "أجب بكلمة واحدة فقط: labor أو rent أو nda أو other"
                )},
                {"role": "user", "content": text[:1500]},
            ],
            temperature=0,
            max_tokens=10,
        )
        label = resp.choices[0].message.content.strip().lower()
        if label in ("rent", "labor", "nda", "other"):
            return label
    except Exception:
        pass
    return detect_namespace(text[:1000])

@retry(
    retry=retry_if_exception_type((openai.RateLimitError, openai.APIError)),
    wait=wait_exponential(multiplier=1, min=2, max=60),
    stop=stop_after_attempt(5),
)
def embed_batch_sync(texts: list[str]) -> list[list[float]]:
    resp = _sync_client.embeddings.create(model="text-embedding-3-large", input=texts)
    return [item.embedding for item in resp.data]


def retrieve_chunks_raw(query: str, namespace: str, top_k: int = TOP_K_RETRIEVE) -> list[dict]:
    q_vector   = embed_batch_sync([query])[0]
    namespaces = [NS_RENT, NS_LABOR, NS_NDA] if namespace == "both" else [namespace]
    all_chunks = []
    for ns in namespaces:
        result = index.query(
            vector=q_vector, top_k=top_k,
            namespace=ns, include_metadata=True,
        )
        for match in result.matches:
            if match.score >= SCORE_THRESHOLD:
                all_chunks.append({
                    "id":          match.id,
                    "score":       round(match.score, 3),
                    "text":        match.metadata.get("text", ""),
                    "namespace":   ns,
                    "reference":   match.metadata.get("reference", ""),
                    "source_file": match.metadata.get("source_file", ""),
                })
    return all_chunks


def rerank_chunks(query: str, chunks: list[dict], top_k: int = TOP_K_FINAL) -> list[dict]:
    if not chunks:
        return []
    pairs  = [(query, c["text"]) for c in chunks]
    scores = get_reranker().predict(pairs)
    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)
    return sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)[:top_k]


def build_context(chunks: list[dict]) -> str:
    if not chunks:
        return "لا توجد نتائج ذات صلة."
    parts = []
    for i, c in enumerate(chunks, 1):
        ref = f" [{c['reference']}]"        if c.get("reference")   else ""
        src = f" (ملف: {c['source_file']})" if c.get("source_file") else ""
        parts.append(f"[{i}] ns={c['namespace']}{ref}{src}\n{c['text']}")
    return "\n\n".join(parts)


def generate_multi_queries_sync(original_query: str) -> list[str]:
    resp1 = _sync_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": (
                "أنت مساعد قانوني. صغ 3 طرق مختلفة للسؤال التالي "
                "لتغطية مصطلحات مختلفة في قاعدة البيانات. "
                "اكتب كل صياغة في سطر منفصل فقط بدون ترقيم."
            )},
            {"role": "user", "content": original_query},
        ],
        temperature=0.2, max_tokens=200,
    )
    lines   = resp1.choices[0].message.content.strip().split("\n")
    queries = [original_query] + [l.strip() for l in lines if l.strip()]

    resp2 = _sync_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": (
            f"اكتب فقرة قصيرة تبدو كنص من نظام العمل السعودي "
            f"أو نظام الإيجار تجيب على: {original_query}"
        )}],
        temperature=0.1, max_tokens=150,
    )
    queries.append(resp2.choices[0].message.content.strip())
    return queries[:5]


async def analyze_contract(contract_text: str, namespace: str) -> dict:
    import asyncio
    t0         = time.time()
    clean_text = redact_pii(contract_text)
    loop       = asyncio.get_event_loop()

    queries = await loop.run_in_executor(None, generate_multi_queries_sync, clean_text[:500])

    unique_chunks: dict = {}
    for q in queries:
        for chunk in await loop.run_in_executor(None, retrieve_chunks_raw, q, namespace):
            cid = chunk["id"]
            if cid not in unique_chunks:
                unique_chunks[cid] = chunk
            else:
                unique_chunks[cid]["score"] = max(unique_chunks[cid]["score"], chunk["score"])

    raw_chunks    = sorted(unique_chunks.values(), key=lambda x: x["score"], reverse=True)
    reranked      = await loop.run_in_executor(None, rerank_chunks, clean_text[:300], raw_chunks)
    legal_context = build_context(reranked) if reranked else "لا يوجد سياق قانوني ذات صلة."

    system_prompt, who = get_persona(namespace)
    response = await ai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt + ANALYSIS_SUFFIX},
            {"role": "user",   "content": f"الأنظمة القانونية المرجعية:\n{legal_context}\n\nنص العقد:\n{clean_text[:6000]}"},
        ],
        temperature=0, max_tokens=3000,
    )

    analysis    = response.choices[0].message.content
    tokens_used = response.usage.total_tokens
    latency_ms  = int((time.time() - t0) * 1000)

    verdict = "review"
    if "✅" in analysis or "آمن قانونياً" in analysis:   verdict = "safe"
    elif "❌" in analysis or "بنوداً خطيرة" in analysis: verdict = "dangerous"

    summary = ""
    if "## التوصية" in analysis:
        summary = analysis.split("## التوصية")[-1].strip()[:300]

    confidence = 0.0
    if "## نسبة الثقة" in analysis:
        try:
            conf_text  = analysis.split("## نسبة الثقة")[-1].strip()[:5]
            confidence = float(''.join(filter(str.isdigit, conf_text))) / 100
        except Exception:
            confidence = 0.0

    return {
        "analysis":       analysis,
        "verdict":        verdict,
        "summary":        summary,
        "confidence":     confidence,
        "confidence_score": confidence,
        "tokens_used":    tokens_used,
        "latency_ms":     latency_ms,
        "persona":        who,
    }


async def chat_with_contract(
    user_message: str, contract_text: str,
    namespace: str, history: list[dict],
) -> tuple[str, int]:
    import asyncio
    loop      = asyncio.get_event_loop()
    clean_msg = redact_pii(user_message)

    queries = await loop.run_in_executor(None, generate_multi_queries_sync, clean_msg)
    unique_chunks: dict = {}
    for q in queries:
        for chunk in await loop.run_in_executor(None, retrieve_chunks_raw, q, namespace):
            if chunk["id"] not in unique_chunks:
                unique_chunks[chunk["id"]] = chunk

    raw_chunks    = sorted(unique_chunks.values(), key=lambda x: x["score"], reverse=True)
    reranked      = await loop.run_in_executor(None, rerank_chunks, clean_msg, raw_chunks)
    legal_context = build_context(reranked) if reranked else ""

    system_prompt, _ = get_persona(namespace)
    messages = [{"role": "system", "content": (
        f"{system_prompt}\n\n"
        f"ملخص العقد المحلل:\n{contract_text[:2000]}\n\n"
        f"السياق القانوني للسؤال الحالي:\n{legal_context}"
    )}]
    for msg in history[-10:]:
        messages.append(msg)
    messages.append({"role": "user", "content": clean_msg})

    response = await ai_client.chat.completions.create(
        model="gpt-4o", messages=messages, temperature=0.2, max_tokens=1000,
    )
    return response.choices[0].message.content, response.usage.total_tokens