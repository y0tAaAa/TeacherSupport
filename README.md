# TeacherSupport Studio

An AI-assisted lesson planning tool for teachers and private tutors. Generate structured lesson plans, track student progress, and get personalized adaptation suggestions — all in a single static web app with no backend required.

## Features

- **Lesson builder** — generate a 4-block lesson plan from subject, topic, level, duration, and teacher notes; supports English and Slovak output
- **Student profiles** — store notes, subject focus, and custom pre/post checklists per student
- **Checklists** — fill in readiness and outcome scores before and after each lesson; the app interprets them automatically
- **Session history** — browse past lessons with checklist interpretation, adaptation suggestions, and risk flags
- **Analytics** — score trends and session statistics per student
- **Model integration** — works in mock mode out of the box; plugs into any OpenAI-compatible LLM backend (local or cloud) for real AI generation

## Tech stack

- Vanilla HTML / CSS / JavaScript — zero dependencies, no build step
- `localStorage` for all data — works fully offline
- OpenAI-compatible chat completions API for real model mode
- Python stdlib HTTP server for local model testing

## Getting started

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

The app starts in **mock mode** — lesson plans are generated from templates so you can explore the full UI without any API key.

## Local model testing

Start the bundled test host (Python 3.8+, no extra packages needed):

```bash
python local_test_host.py
# serves the app at http://127.0.0.1:8000/
# exposes a mock OpenAI-compatible endpoint at http://127.0.0.1:8000/v1/chat/completions
```

Then open the **Model setup** tab in the app and click **Use test model**.

## Real LLM integration

Switch to **Real** mode in the Model setup tab, enter your API base URL and optional API key. The app works with:

- Any OpenAI-compatible endpoint (local [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/), etc.)
- [OpenRouter](https://openrouter.ai/) for cloud models
- [Hugging Face Inference](https://huggingface.co/inference-api) endpoints

The system prompt used for generation is documented in [`REAL_MODEL_PROMPT.md`](REAL_MODEL_PROMPT.md).

## Project structure

```
index.html              — app shell and tabbed UI
styles.css              — design system and responsive layout
app.js                  — all app logic (state, rendering, model calls)
local_test_host.py      — local mock server for offline model testing
REAL_MODEL_PROMPT.md    — system prompt for real LLM integration
teachersupport_v2.html  — original business model document (reference only)
```

## Roadmap

### Custom education AI model
The next major milestone is training a domain-specific model oriented around modern teaching trends and pedagogy. The goal is to replace the generic LLM backend with a fine-tuned model that:

- understands lesson structure, learning objectives, and scaffolding patterns
- is trained on pedagogical literature and structured lesson plan data
- produces more consistent and educationally grounded output than a general-purpose model
- can run locally (Qwen / LLaMA base) for privacy-conscious deployments

The foundation for this is already in place: the structured JSON output format, the session history schema, and the system prompt define a clear training signal. The next steps are dataset collection, fine-tuning experiments, and evaluation against teacher feedback.

### Other planned features
- Student progress reports (PDF export)
- Multi-teacher workspace with shared student profiles
- Spaced repetition reminders based on session history
- Mobile-optimised layout

## Background

Built as an MVP to validate the idea of AI-assisted lesson preparation for individual tutors. The tool targets the gap between generic AI chatbots and the real workflow of a teacher preparing for a one-on-one session — student context, lesson history, and structured feedback in one place.
