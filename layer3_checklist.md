# 📊 Layer 3 Flows Checklist & Action Tracker

This document helps us structure Layer 3 with precision. It's not just about improving the puppeteer tool — it's about using it as an investigative microscope for diagnosing slowness, AJAX bloat, and frontend UX inefficiencies *page by page*.

We passed:
- ✅ Layer 1: Functionality — each student flow loads and shows expected components.
- ✅ Layer 2: Timing — each flow now logs DOM readiness, visual completion, XHR timing, and flags pages taking longer than expected.

Now Layer 3 begins:
- 🧠 Goal: Find the **why** behind slowness or bloat for each student-facing flow.
- 🔁 Strategy: Focus on **one flow at a time**, debug until root cause is found, then apply a fix or prepare one.

---

## ✅ loginFlow
### Layer 2 Finding:
- Login is **slow** — took 12.6s

### Layer 3 Goal:
- Identify cause of delay (is it DOM? redirect lag? auth latency?)

### Insights:
- Form responsiveness was OK
- Likely culprit: redirect post-login is waiting on BuddyBoss plugins or dashboard scripts

### Action:
- [ ] Log redirect timing
- [ ] Log post-login network tab load
- [ ] Try disabling BuddyBoss welcome widget

---

## ✅ coursesFlow
### Layer 2 Finding:
- DOM: ~4.6s
- Total wait: ~7.6s

### Layer 3 Goal:
- Determine why it takes ~3s to fully render after DOM ready

### Insights:
- XHR: No major bloat found
- Cards are preloaded — no lazy loading issues
- Could be due to too much DOM paint / plugin interference

### Action:
- [ ] Log repaint cost (Layer 4?)
- [ ] Track scroll responsiveness
- [ ] Verify what triggers after DOM load

---

## ✅ coursePageFlow
### Layer 2 Finding:
- DOM + Lessons: ~7.4s
- ⚠️ Warning: Slow (>7s)

### Layer 3 Goal:
- Determine what causes slow lesson list/tabs render

### Insights:
- Tabs render fast, but lesson list takes time
- Possible causes: LearnDash filters, jQuery tab listeners

### Action:
- [ ] Add tab event timing
- [ ] Identify scripts modifying .ld-lesson-list
- [ ] Confirm LearnDash course template customizations

---

## ✅ lessonPageFlow
### Layer 2 Finding:
- Total: ~8.8s
- Multiple video chunk XHRs tracked

### Layer 3 Goal:
- Analyze Vimeo load sequence and iframe latency

### Insights:
- iframe loads ok, but buffering behavior triggers multiple XHRs
- UX depends on network + vimeo config (expensive ops)

### Action:
- [ ] Detect `loadeddata` vs `canplaythrough` for video
- [ ] Monitor iframe `load` vs player events
- [ ] Log number of XHR video chunks

---

## ✅ ticketFlow
### Layer 2 Finding:
- DOM: ~3.2s, Total: ~15.8s
- 🐢 Slow submit XHR: 1065ms

### Layer 3 Goal:
- Explain long post-submit wait time

### Insights:
- ACF dynamic fields add delay
- Validation XHR on ACF submit is slow
- Modal logic adds extra delay

### Action:
- [ ] Measure time between click → response
- [ ] Isolate ACF save hook on server
- [ ] Test removing modal display after submit

---

## ✅ placementFlow
### Layer 2 Finding:
- Total: 3.4s — ✅ fast

### Layer 3 Goal:
- Confirm resilience for edge cases (missing resume / no courses)

### Insights:
- Resume label and form render fast
- All elements present

### Action:
- [ ] Add test case where no courses are returned
- [ ] Confirm course list comes from ACF or shortcode

---

## ✅ gradesFlow
### Layer 2 Finding:
- Total: ~3.9s
- 🐢 Slow AJAX: 889ms

### Layer 3 Goal:
- Explain the slow `fetch_client_grades` admin-ajax call

### Insights:
- Response time for grade table is borderline
- AJAX may join too many fields

### Action:
- [ ] Add xhr logger with request size
- [ ] Review `fetch_client_grades` in backend
- [ ] Compare with user having 0 vs many courses

---

## ✅ supportFlow
### Layer 2 Finding:
- Total: ~3.2s

### Layer 3 Goal:
- Confirm the form is accessible quickly & that external redirect is sane

### Insights:
- DOM + button appear fast
- No XHR tracked

### Action:
- [ ] Simulate click on `.support-button`
- [ ] Log what opens (new tab? redirect?)
- [ ] Confirm no layout shift on scroll

---

## 🔁 Next Steps
- [ ] Add performance threshold check per flow
- [ ] Add CSV/JSON export format
- [ ] Add CLI flag for --report (light mode)
- [ ] Move forward **one flow at a time** to fix & test

Let me know which flow to start Layer 3 deep debugging with.
