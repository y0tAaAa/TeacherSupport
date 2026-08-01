#!/usr/bin/env python3
"""
TeacherSupport Dataset Generator
Generates synthetic training data using Qwen2.5-Coder via HuggingFace Inference API.

Produces two dataset types:
  - lesson_plans.jsonl  — structured lesson plans (input context → JSON lesson plan)
  - qa_pedagogy.jsonl   — pedagogical Q&A pairs (question → expert answer)

Usage:
  export HF_TOKEN=hf_...
  python dataset_generator.py --mode all --count 100

  # or target specific datasets:
  python dataset_generator.py --mode lessons --count 60
  python dataset_generator.py --mode qa --count 40

Environment variables:
  HF_TOKEN   HuggingFace API token (required for cloud)
  MODEL      model ID (default: Qwen/Qwen2.5-Coder-7B-Instruct)
  API_BASE   override full API endpoint URL
"""

from __future__ import annotations

import argparse
import json
import os
import random
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────────────────

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODEL = os.environ.get("MODEL", "Qwen/Qwen2.5-Coder-7B-Instruct")
API_BASE = os.environ.get(
    "API_BASE",
    f"https://api-inference.huggingface.co/models/{MODEL}/v1/chat/completions"
)
OUTPUT_DIR = Path(__file__).parent / "datasets"
REQUEST_DELAY = 10       # seconds between requests (HF free tier ~6 rpm)
MAX_RETRIES = 3
RETRY_DELAY = 30

# ── System prompts ──────────────────────────────────────────────────────────────
# The fixed teaching methodology is defined once, in REAL_MODEL_PROMPT.md, and
# loaded from disk here so the training data always encodes the exact same
# algorithm as the production app (app.js). Do not hardcode the methodology
# text in this file — edit REAL_MODEL_PROMPT.md instead.

_PROMPT_MD_PATH = Path(__file__).parent / "REAL_MODEL_PROMPT.md"
_PROMPT_BEGIN = "<!-- PROMPT:BEGIN -->"
_PROMPT_END = "<!-- PROMPT:END -->"


def _load_methodology() -> str:
    text = _PROMPT_MD_PATH.read_text(encoding="utf-8")
    start = text.index(_PROMPT_BEGIN) + len(_PROMPT_BEGIN)
    end = text.index(_PROMPT_END)
    return text[start:end].strip()


_METHODOLOGY = _load_methodology()

LESSON_SYSTEM_PROMPT = f"""\
{_METHODOLOGY}

You receive a JSON object describing the student profile, lesson parameters, and teacher notes.
Follow §12 (Production output format) exactly: return ONLY a valid JSON object with the
{{title, summary, blocks, checklistInterpretation, adaptation, riskFlags, teacherNote}} structure.
Produce 4-6 time blocks that sum to the requested duration, labelled with their R-step (§4).
Return strict JSON only — no markdown, no explanation outside the JSON object.
"""

QA_SYSTEM_PROMPT = f"""\
{_METHODOLOGY}

You are answering an isolated question from a teacher or tutor, not generating a lesson plan.
Answer using only the methodology above — do not introduce techniques or frameworks that
are not in it (§11). Name the specific section you are applying (e.g. "per R2...",
"per the below-readiness state in §3...", "per the black-list in §8..."). Be concise
(3-6 sentences), specific, and actionable. Avoid vague generalities.
"""

# ── Seed data ───────────────────────────────────────────────────────────────────

SUBJECTS = {
    "English": {
        "topics": [
            "Present Simple", "Past Simple", "Present Perfect", "Future forms",
            "Conditionals", "Passive Voice", "Question forms", "Modal verbs",
            "Vocabulary building", "Reading comprehension", "Speaking fluency",
            "Essay writing", "Reported speech", "Relative clauses"
        ],
        "levels": ["A1", "A2", "B1", "B2", "C1"],
        "goals": [
            "Practice core grammar in context",
            "Build confidence in spoken production",
            "Develop reading speed and comprehension",
            "Expand active vocabulary",
            "Improve writing accuracy",
            "Prepare for language exam",
            "Master irregular verbs"
        ]
    },
    "Math": {
        "topics": [
            "Linear equations", "Fractions and decimals", "Geometry basics",
            "Statistics and probability", "Quadratic equations", "Trigonometry",
            "Number systems", "Functions and graphs", "Derivatives", "Integrals",
            "Word problems", "Algebraic expressions"
        ],
        "levels": ["Foundations", "Intermediate", "Advanced"],
        "goals": [
            "Solve problems step by step",
            "Understand the underlying concept",
            "Build calculation speed and accuracy",
            "Apply theory to word problems",
            "Prepare for exam",
            "Close gaps from previous lessons"
        ]
    }
}
# Physics, Chemistry, and Slovak were removed: REAL_MODEL_PROMPT.md only defines
# English (§5) and Math (§6) branches, matching what the app itself supports
# (app.js SUBJECTS). Generating data for a subject with no defined branch would
# force the model to invent a methodology — exactly what §11 prohibits. Add a
# branch to REAL_MODEL_PROMPT.md first if another subject is needed.

STUDENT_PROFILES = [
    {"notes": "Responds well to short tasks and visual prompts. Loses focus after 15 minutes."},
    {"notes": "Strong analytical thinker. Needs extra time for reading but excels in problem-solving."},
    {"notes": "Motivated but lacks confidence. Needs positive reinforcement and clear success criteria."},
    {"notes": "Fast learner but makes careless errors. Benefits from self-checking strategies."},
    {"notes": "Struggles with abstract concepts. Prefers concrete examples and step-by-step guidance."},
    {"notes": "High motivation, strong vocabulary. Main challenge is grammar accuracy."},
    {"notes": "Inconsistent attendance, gaps in prior knowledge. Needs frequent recap of prerequisites."},
    {"notes": "Quiet and careful. Needs encouragement to take risks in speaking tasks."},
    {"notes": "Competitive and results-driven. Works best with clear targets and timed tasks."},
    {"notes": "Creative and curious. Engages best with open-ended and discussion-based tasks."},
]

DURATIONS = [30, 45, 60]
LANGUAGES = ["EN", "SK"]

QA_QUESTIONS = [
    # Lesson structure
    "How should I structure a 45-minute lesson for a student who loses focus after 15 minutes?",
    "What is the difference between guided practice and independent practice in a lesson plan?",
    "When should I use an exit ticket and what should it contain?",
    "How do I decide how much time to allocate to each block of a lesson?",
    "What makes a good measurable lesson goal for a one-on-one session?",
    "How should I open a lesson to maximise student engagement from the start?",
    "What is the purpose of a warm-up activity and how long should it last?",
    # Differentiation
    "How do I adapt a lesson for a student who is significantly ahead of expectations?",
    "What strategies work best for students who struggle with abstract concepts?",
    "How should I adjust my plan if the pre-lesson checklist shows low readiness?",
    "What is scaffolding and how do I apply it in a one-on-one session?",
    "How can I support a student who has gaps in prior knowledge from previous lessons?",
    "What is the zone of proximal development and how does it guide lesson difficulty?",
    # Feedback and assessment
    "What is the best way to give corrective feedback without discouraging a student?",
    "How do I interpret post-lesson scores when deciding what to teach next?",
    "What does a low post-lesson score tell me about my teaching approach?",
    "How often should I formally assess a student's progress in private tutoring?",
    "What is the difference between formative and summative assessment?",
    "How can I help a student reflect on their own learning during the session?",
    # Motivation and engagement
    "How do I re-engage a student who has lost motivation mid-lesson?",
    "What techniques improve student engagement during independent tasks?",
    "How can I use student interests to make lessons more relevant?",
    "What role does lesson pacing play in student motivation?",
    "How do I set realistic expectations with a student who has very high self-standards?",
    "What can I do when a student says 'I don't know' to every question?",
    # Cognitive science / modern pedagogy
    "What is spaced practice and why is it more effective than massed practice?",
    "How does retrieval practice differ from re-reading and why is it more effective?",
    "What is the testing effect and how can I use it in one-on-one tutoring?",
    "What does research say about the optimal length of focused learning sessions?",
    "How does the forgetting curve affect lesson planning across weekly sessions?",
    "What is interleaving and when should I apply it versus blocked practice?",
    "Why is it important to make learning slightly difficult (desirable difficulties)?",
    # Subject-specific English
    "What are the most common errors students make when learning Present Simple in English?",
    "How do I teach the difference between Present Simple and Present Continuous effectively?",
    "What activities work best for improving spoken fluency in English?",
    "How should I approach teaching writing at B1 level?",
    "What is the best way to build vocabulary systematically with a tutoring student?",
    # Subject-specific Math
    "How do I teach fractions to a student who struggles with number sense?",
    "What is the most effective sequence for teaching linear equations?",
    "What warm-up activities work well for a math lesson?",
    "How do I help a student who understands the concept but makes calculation errors?",
    "What visual tools help students understand algebraic thinking?",
]
# Physics/Chemistry-specific questions were removed along with the Physics and
# Chemistry entries in SUBJECTS above — see the note there.

# ── API call ────────────────────────────────────────────────────────────────────

def call_api(messages: list[dict], temperature: float = 0.3) -> str:
    headers = {"Content-Type": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    headers["X-Wait-For-Model"] = "true"

    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1200,
    }).encode("utf-8")

    req = urllib.request.Request(API_BASE, data=body, headers=headers, method="POST")

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            status = e.code
            body_text = e.read().decode("utf-8", errors="replace")[:200]
            print(f"    HTTP {status}: {body_text}")
            if status in (429, 503) and attempt < MAX_RETRIES:
                wait = RETRY_DELAY * attempt
                print(f"    Rate limited — waiting {wait}s before retry {attempt}/{MAX_RETRIES}...")
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"    Error: {e} — retrying in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
            else:
                raise

# ── Lesson plan generation ──────────────────────────────────────────────────────

def build_lesson_input() -> dict:
    subject = random.choice(list(SUBJECTS.keys()))
    cfg = SUBJECTS[subject]
    profile = random.choice(STUDENT_PROFILES)
    language = random.choice(LANGUAGES)
    return {
        "teacher": {"name": "Teacher", "role": "Private tutor"},
        "student": {
            "name": random.choice(["Alex", "Maria", "Tom", "Jana", "Peter", "Sara", "Lukas", "Emma"]),
            "subject": subject,
            "notes": profile["notes"],
            "lessonCount": random.randint(1, 20)
        },
        "lesson": {
            "subject": subject,
            "topic": random.choice(cfg["topics"]),
            "goal": random.choice(cfg["goals"]),
            "level": random.choice(cfg["levels"]),
            "duration": random.choice(DURATIONS),
            "language": language,
            "notes": profile["notes"]
        }
    }

def generate_lesson_example() -> dict | None:
    inp = build_lesson_input()
    messages = [
        {"role": "system", "content": LESSON_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(inp, ensure_ascii=False)}
    ]
    raw = call_api(messages, temperature=0.4)

    # strip markdown code fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
        if raw.endswith("```"):
            raw = raw[:-3].strip()

    try:
        output = json.loads(raw)
    except json.JSONDecodeError:
        print("    Could not parse JSON output — skipping.")
        return None

    return {
        "messages": [
            {"role": "system", "content": LESSON_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(inp, ensure_ascii=False)},
            {"role": "assistant", "content": json.dumps(output, ensure_ascii=False)}
        ],
        "metadata": {
            "subject": inp["lesson"]["subject"],
            "topic": inp["lesson"]["topic"],
            "level": inp["lesson"]["level"],
            "language": inp["lesson"]["language"],
            "generated_at": datetime.utcnow().isoformat()
        }
    }

# ── Q&A generation ──────────────────────────────────────────────────────────────

def generate_qa_example(question: str) -> dict | None:
    messages = [
        {"role": "system", "content": QA_SYSTEM_PROMPT},
        {"role": "user", "content": question}
    ]
    answer = call_api(messages, temperature=0.5)
    if not answer:
        return None
    return {
        "messages": [
            {"role": "system", "content": QA_SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ],
        "metadata": {
            "type": "qa_pedagogy",
            "generated_at": datetime.utcnow().isoformat()
        }
    }

# ── Main ────────────────────────────────────────────────────────────────────────

def run_lessons(count: int, output_path: Path) -> int:
    saved = 0
    for i in range(count):
        print(f"  [lesson {i+1}/{count}] generating...")
        try:
            example = generate_lesson_example()
            if example:
                with output_path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(example, ensure_ascii=False) + "\n")
                saved += 1
                print(f"    saved ({saved} total)")
        except Exception as e:
            print(f"    failed: {e}")
        if i < count - 1:
            time.sleep(REQUEST_DELAY)
    return saved

def run_qa(count: int, output_path: Path) -> int:
    questions = QA_QUESTIONS.copy()
    random.shuffle(questions)
    questions = (questions * ((count // len(questions)) + 1))[:count]
    saved = 0
    for i, q in enumerate(questions):
        print(f"  [qa {i+1}/{count}] {q[:60]}...")
        try:
            example = generate_qa_example(q)
            if example:
                with output_path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(example, ensure_ascii=False) + "\n")
                saved += 1
                print(f"    saved ({saved} total)")
        except Exception as e:
            print(f"    failed: {e}")
        if i < count - 1:
            time.sleep(REQUEST_DELAY)
    return saved

def main() -> None:
    parser = argparse.ArgumentParser(description="TeacherSupport dataset generator")
    parser.add_argument("--mode", choices=["lessons", "qa", "all"], default="all",
                        help="Which dataset to generate (default: all)")
    parser.add_argument("--count", type=int, default=50,
                        help="Total examples to generate (split evenly for 'all')")
    args = parser.parse_args()

    if not HF_TOKEN and "localhost" not in API_BASE and "127.0.0.1" not in API_BASE:
        print("WARNING: HF_TOKEN is not set. Set it with:  export HF_TOKEN=hf_...")
        print("         Or use a local endpoint via:        export API_BASE=http://127.0.0.1:8000/v1/chat/completions")
        print()

    OUTPUT_DIR.mkdir(exist_ok=True)

    print(f"Model : {MODEL}")
    print(f"API   : {API_BASE}")
    print(f"Output: {OUTPUT_DIR}/")
    print()

    if args.mode in ("lessons", "all"):
        n = args.count if args.mode == "lessons" else args.count // 2
        out = OUTPUT_DIR / "lesson_plans.jsonl"
        print(f"Generating {n} lesson plan examples → {out.name}")
        saved = run_lessons(n, out)
        print(f"Done — {saved}/{n} lesson plans saved.\n")

    if args.mode in ("qa", "all"):
        n = args.count if args.mode == "qa" else args.count - (args.count // 2)
        out = OUTPUT_DIR / "qa_pedagogy.jsonl"
        print(f"Generating {n} Q&A examples → {out.name}")
        saved = run_qa(n, out)
        print(f"Done — {saved}/{n} Q&A pairs saved.\n")

    print("All done.")

if __name__ == "__main__":
    main()
