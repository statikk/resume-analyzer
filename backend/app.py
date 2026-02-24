import os
import json
from typing import Any, Dict, Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from openai import OpenAI

# -------------------------
# Config
# -------------------------
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="Resume Analyzer API")

# -------------------------
# CORS
# -------------------------
# Prod: set FRONTEND_ORIGIN in Render (e.g., https://resume-analyzer-pi-ten.vercel.app)
# Dev: still allow localhost:3000
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "").strip()

allow_origins: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if FRONTEND_ORIGIN:
    allow_origins.insert(0, FRONTEND_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Helpers
# -------------------------
def extract_text_from_pdf(file_obj) -> str:
    try:
        reader = PdfReader(file_obj)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF_READ_FAILED: {e}")

    parts: List[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            parts.append("")
    return "\n".join(parts)


def try_parse_json(s: str) -> Optional[Dict[str, Any]]:
    try:
        obj = json.loads(s)
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def ensure_list_of_str(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(x, str) for x in value)


def validate_result(obj: Dict[str, Any]) -> None:
    required_keys = [
        "fit_level",
        "suitable",
        "confidence",
        "summary",
        "matched_required_skills",
        "missing_required_skills",
        "matched_nice_to_have",
        "missing_nice_to_have",
        "risk_flags",
        "evidence",
        "screening_recommendation",
        "interview_focus_areas",
        "final_verdict",
        "final_why",
    ]
    for k in required_keys:
        if k not in obj:
            raise ValueError(f"Missing key: {k}")

    if obj["fit_level"] not in ("Strong", "Medium", "Low"):
        raise ValueError("fit_level invalid")
    if obj["confidence"] not in ("High", "Medium", "Low"):
        raise ValueError("confidence invalid")
    if obj["screening_recommendation"] not in (
        "Proceed to technical interview",
        "Recruiter screen only",
        "Reject",
    ):
        raise ValueError("screening_recommendation invalid")

    if not isinstance(obj["suitable"], bool):
        raise ValueError("suitable must be boolean")

    if not isinstance(obj["summary"], str):
        raise ValueError("summary must be string")
    if not isinstance(obj["final_verdict"], str):
        raise ValueError("final_verdict must be string")

    for lk in [
        "matched_required_skills",
        "missing_required_skills",
        "matched_nice_to_have",
        "missing_nice_to_have",
        "risk_flags",
        "interview_focus_areas",
        "final_why",
    ]:
        if not ensure_list_of_str(obj[lk]):
            raise ValueError(f"{lk} must be list[str]")

    if not isinstance(obj["evidence"], list):
        raise ValueError("evidence must be list")
    for e in obj["evidence"]:
        if not isinstance(e, dict) or "claim" not in e or "snippet" not in e:
            raise ValueError("evidence items must be objects with claim/snippet")
        if not isinstance(e["claim"], str) or not isinstance(e["snippet"], str):
            raise ValueError("evidence claim/snippet must be strings")


# -------------------------
# Prompting
# -------------------------
SCHEMA_HINT = {
    "fit_level": "Strong|Medium|Low",
    "suitable": True,
    "confidence": "High|Medium|Low",
    "summary": "",
    "matched_required_skills": [],
    "missing_required_skills": [],
    "matched_nice_to_have": [],
    "missing_nice_to_have": [],
    "risk_flags": [],
    "evidence": [{"claim": "", "snippet": ""}],
    "screening_recommendation": "Proceed to technical interview | Recruiter screen only | Reject",
    "interview_focus_areas": [],
    "final_verdict": "",
    "final_why": [],
}

SYSTEM_PROMPT = """You are an AI recruiting assistant helping recruiters pre-screen candidates.

You must:
- Return VALID JSON only (no markdown, no extra text).
- Be evidence-driven: evidence snippets must be direct excerpts from the resume text (<= 25 words).
- Do NOT invent facts or experience.
- Be concise and useful for recruiter decisions.
"""


def build_user_prompt(position_title: str, position_description: str, resume_text: str) -> str:
    desc = (position_description or "").strip()
    if not desc:
        desc = "(empty)"

    return f"""Position Title:
{position_title}

Position Description:
{desc}

Resume Text:
{resume_text}

Return JSON EXACTLY with this schema (same keys, same types):
{json.dumps(SCHEMA_HINT, indent=2)}

Guidelines:
- fit_level:
  Strong → Meets most required skills with clear evidence.
  Medium → Partial match; some required gaps but potentially trainable.
  Low → Major required skills missing.
- suitable:
  true only if required gaps are minor.
- confidence:
  High → Resume clearly detailed.
  Medium → Some ambiguity.
  Low → Insufficient clarity.
- screening_recommendation must be one of:
  "Proceed to technical interview"
  "Recruiter screen only"
  "Reject"
- If Position Description is empty, infer typical requirements from the Position Title and mention that assumption briefly in summary.

Output constraints:
- summary: 2–4 sentences max.
- final_verdict: EXACTLY 1 sentence. Must align with suitable + screening_recommendation.
- final_why: 2–4 bullet points (list items) explaining WHY this verdict was chosen.
- Keep lists concise:
  matched_required_skills 4–8 (if possible),
  missing_required_skills 2–8,
  risk_flags 0–6,
  evidence 2–6,
  interview_focus_areas 3–7.
All output in English.
"""


# -------------------------
# Routes
# -------------------------
@app.get("/health")
def health():
    return {"ok": True, "model": OPENAI_MODEL}


@app.post("/analyze")
async def analyze(
    position_title: str = Form(...),
    position_description: str = Form(""),
    cv_pdf: UploadFile = File(...),
):
    title = (position_title or "").strip()
    if len(title) < 3:
        raise HTTPException(status_code=400, detail="INVALID_INPUT: position_title too short")

    if cv_pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="UNSUPPORTED_FILE_TYPE: PDF only")

    # 1) Extract text
    text = extract_text_from_pdf(cv_pdf.file).strip()
    if len(text) < 300:
        raise HTTPException(status_code=400, detail="NO_EXTRACTABLE_TEXT: looks like scan")

    # 2) Cap text size for MVP cost control
    resume_text = text[:50000]
    user_prompt = build_user_prompt(title, position_description, resume_text)

    # 3) Call model (no temperature for gpt-5-mini)
    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OPENAI_CALL_FAILED: {e}")

    content = (resp.choices[0].message.content or "").strip()
    parsed = try_parse_json(content)

    # 4) Retry once if JSON invalid
    if parsed is None:
        try:
            repair = f"""Your previous response was not valid JSON.
Return ONLY valid JSON matching the schema exactly.
Previous output:
{content}
"""
            resp2 = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                    {"role": "user", "content": repair},
                ],
            )
            content2 = (resp2.choices[0].message.content or "").strip()
            parsed = try_parse_json(content2)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OPENAI_REPAIR_FAILED: {e}")

    if parsed is None:
        raise HTTPException(status_code=500, detail="ANALYSIS_FAILED: invalid JSON from model")

    # 5) Validate schema
    try:
        validate_result(parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ANALYSIS_FAILED: schema validation error: {e}")

    # Minimal log (no CV stored)
    print(
        {
            "title": title,
            "fit": parsed.get("fit_level"),
            "suitable": parsed.get("suitable"),
            "rec": parsed.get("screening_recommendation"),
        }
    )

    return parsed