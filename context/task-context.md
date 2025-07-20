# Task Context: Refactor TicketFlow for Performance Analysis

## 🟩 Objective

- Extract **all performance-related code** from `ticketFlow.js` into `ticketFlow/ticketFlow-perf.js`.
- Enable modular, timeline-based performance tracking for `/tickets/` page.
- Log and export metrics for every phase: navigation, DOM, controls, forms, plugin/assets (where possible).

## 🗂️ Reference Files

- `ticketFlow.js` (source of truth, spaghetti code)
- `ticketFlow-timeline-debug.md` (timeline ideas, metric names)
- `puppeteer-navigation.md` (robust navigation)
- `.continuerules` (current, see repo root)
- (optionally: `layer3_checklist.md`, for reference only—not included in perf code)

## 🟢 Key Rules

- Only **performance code** in `ticketFlow-perf.js`.
- Use a single `timeline` object (timeline.start, domReady, buttonsReady, formReady, etc.)
- NO UX/QA checks in this script.
- Use `addMetric()` for export.
- Optionally log asset/plugin/resource timing, or note as TODO.
- All logic should be minimal, readable, and extensible for perf-only tasks.

## 🚩 Deliverables

- `ticketFlow/ticketFlow-perf.js`
- Updated `.continuerules`
- Updated `README.md` (folder usage, flow types)
- Perf report(s) ready to be used in load investigations or regression tracking.

---

(Ready for next engineering step: paste this as the project prompt in Continue, and begin the refactor.)
