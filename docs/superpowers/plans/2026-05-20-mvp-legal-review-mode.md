# MVP Legal Review Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded contract review answers cite both contract passages and legal sources more clearly.

**Architecture:** Keep the current chat and RAG flow. Structure uploaded document text into stable paragraph references in the backend prompt, tighten the legal-review instructions, and show current-chat contract context beside legal citations in the assistant UI.

**Tech Stack:** FastAPI/Python assistant orchestration, Next.js React dashboard, pytest, Vitest.

---

### Task 1: Structure Uploaded Contract Context

**Files:**
- Modify: `agentic_orchestrator.py`
- Test: `tests/test_assistant_grounding.py`

- [ ] Write a backend test that uploaded documents appear as numbered contract paragraphs such as `[Contract D1.P1]`.
- [ ] Verify the test fails before implementation.
- [ ] Add paragraph formatting that preserves extracted line boundaries and caps each paragraph.
- [ ] Verify the backend test passes.

### Task 2: Tighten Legal Review Instructions

**Files:**
- Modify: `agentic_orchestrator.py`
- Test: `tests/test_assistant_grounding.py`

- [ ] Extend the existing LLM prompt test to capture agent instructions.
- [ ] Verify it fails until the prompt requires contract issue, contract passage, legal rule, risk, and recommendation.
- [ ] Add concise Dutch legal-review answer requirements.
- [ ] Verify the backend test passes.

### Task 3: Show Contract Context In The Right Panel

**Files:**
- Modify: `src/components/dashboard/assistant-streaming-page.tsx`
- Test: `src/__tests__/assistant-stream.test.tsx`

- [ ] Add a frontend test that attached documents appear in the right-side research context panel.
- [ ] Verify the test fails before implementation.
- [ ] Extend the citation sidebar to include current-chat contract attachments with a small preview.
- [ ] Render the sidebar when either legal citations or contract documents exist.
- [ ] Verify the frontend test passes.

### Task 4: Verification

**Commands:**
- `python3 -m pytest tests/test_assistant_grounding.py -q`
- `npm test -- --run src/__tests__/assistant-stream.test.tsx`
- `npm run typecheck`

Expected result: all commands pass. Restart local backend/frontend if browser testing is needed.
