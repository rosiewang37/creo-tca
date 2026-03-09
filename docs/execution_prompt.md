# Execution Prompt
## Copy everything below this line and paste as your first message in a new Claude Code session.

---

You are building the CREO Lead Prioritization Tool — a full-stack web app for a residential painting company's sales team.

Before writing any code, read these files in order:
1. `CLAUDE.md` — project context, tech stack, data schema, Supabase config, coding conventions
2. `docs/PRD.md` — what to build (features + acceptance criteria checklists)
3. `docs/technical_spec.md` — how to build it (architecture, data pipeline, API contracts, file structure)
4. `docs/roadmap.md` — build phases and order
5. `docs/execution.md` — step-by-step execution instructions

Then build the project following the phases in `roadmap.md` and execution steps in `execution.md`.

**Key constraints — do not deviate:**
- LLM: Gemini 2.0 Flash via `google-generativeai` package, env var `GEMINI_API_KEY` — not Claude/Anthropic
- Queue: localStorage only — no database writes ever
- Backend: FastAPI on port 8000 | Frontend: Next.js on port 3000
- UI: light theme, white/off-white background, shadcn/ui default + blue primary accent
- Supabase: read-only (never write to inbound_leads table)
- No user authentication
- Run backend (Phase 1–3) and frontend (Phase 4) in parallel once setup is complete

Print a milestone banner when each phase completes, e.g.:
```
===== PHASE 1 COMPLETE: Data pipeline + EDA charts generated =====
```