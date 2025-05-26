# 📊 Puppeteer UX QA Automation Suite

## 🧠 Purpose

This project is a **Puppeteer-based automated QA test suite** used to audit user experience (UX), performance, and AJAX behavior across key student pages on the [Ecom College LMS site](https://app.digitalschool.co.il). It helps us:

* Measure **UX and performance metrics**
* Track **AJAX latency and plugin activity**
* Detect **edge case issues** and **slow rendering**
* Validate **forms, modals, video players, and dynamic content**

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run a full QA audit (all flows)

```bash
npm run audit
```

This runs `main.js` and tests every flow (login → support).

### 3. Run a specific flow

```bash
npm start -- <flowName>
```

Examples:

```bash
npm start -- login
npm start -- grades
npm start -- ticket
```

### 4. Show help menu

```bash
npm start -- help
```

## ✅ Available Flows

Each flow simulates a user journey and logs relevant UX metrics:

| Flow         | Description                                               |
| ------------ | --------------------------------------------------------- |
| `login`      | Logs in with a test user and measures form responsiveness |
| `courses`    | Loads the courses page and counts rendered cards          |
| `coursePage` | Loads course tabs and lesson list                         |
| `lessonPage` | Loads a specific lesson, tracks iframe and sidebar load   |
| `ticket`     | Tests ticket submission flow and modal handling           |
| `placement`  | Loads placement form and job-prep courses section         |
| `grades`     | Loads grades table, validates AJAX load times             |
| `support`    | Opens the support guide and checks visibility             |

## 📐 UX Metrics Tracked

Each flow includes measurements like:

* ⏱️ Time to DOM render
* 📚 Component readiness (e.g., lesson list, ticket form)
* 🧠 AJAX and REST call durations
* 🐢 Warnings for slow requests (>500ms)
* 🧭 Sidebar/iframe/modal performance

## 📁 File Structure

```txt
/flows/               # Individual flow files (e.g. loginFlow.js)
/logger/              # XHR logging system
  ├─ loggerXHR.js     # Logs all fetch/XHR + summaries
  └─ xhr-summary.js   # Grouped stats printed at end
main.js               # Runs full audit (all flows sequentially)
flow-runner.js        # CLI tool to run specific flow by name
package.json          # npm scripts
```

## 🎯 Current Progress

* ✅ Layer 1 QA flows implemented for all pages
* ✅ Layer 2 performance timing metrics (DOM + interaction timing)
* ✅ CLI runner with `npm start -- <flow>` support
* ✅ XHR summary per flow with slow thresholds
* ✅ Full session summary after runs
* ✅ UX metric checklist for each page/flow

## 📌 Next Steps

* 🧠 Add deep Layer 3 edge case validation:

  * Field validations (client + server)
  * Conditional rendering checks (when fields are hidden/shown)
  * Scroll performance for long pages
* 🔁 Support multiple flows in one command: `npm start -- login grades`
* 💾 Optional: Log results to JSON file for trend analysis
* 🌐 Add headless mode CI script (for production validation)

## 📘 Developer Tips

* Don't use `npm run <flow>` aliases yet — we expect flow names to evolve
* Logs saved in `/logger/logs/xhr-summary.txt` and `xhr-full-log.txt`
* Slow responses are flagged with 🐢 and grouped by source

---

Last updated: 2025-05-25
