---
description: Timeline breakdown and performance debugging for Puppeteer ticket flow with Layer 1–3 validation
---

You are helping with performance debugging of a Puppeteer-based test suite for a WordPress LMS.

The main flow is `ticketFlow`, which includes:
- DOM load
- globalHeaderFlow (Layer 3 UI QA)
- globalSidebarFlow (Layer 3 UI QA)
- ACF form opening
- ACF dropdown logic validation
- Sector/sub-sector selection
- Typing + submission via TinyMCE
- Modal open/close validation
- Table row validation

You are working inside a structured `timeline` object that logs:
- `start`, `domReady`, `buttonsReady`, `headerDone`, `sidebarDone`, `formReady`, `dropdownDone`, `selectDone`, `submitDone`, `modalDone`, `rowsDone`

You are expected to:
- Validate that no phase's duration includes time from another (no overlaps).
- Help design accurate `performance.now()` logs around each step.
- Suggest granular breakdown fields such as `headerMs`, `formReadyMs`, `submitMs`, `typingDoneMs`.
- Focus on accurate `totalMs` without redundant accumulation.

Avoid vague suggestions — validate each calculation using the timeline object.

If asked to patch or refactor, preserve the structure of the existing timeline metrics.

Do not suggest UI Layer 3 fixes unless explicitly requested.
