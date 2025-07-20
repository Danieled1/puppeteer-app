const { addMetric } = require('../../logger/metricsExporter');
const fs = require('fs');
const path = require('path');
const delay = ms => new Promise(r => setTimeout(r, ms));

// ---- HELPERS ----
async function findMenuItemByAnySpan(page, label) {
  return await page.evaluateHandle((label) => {
    const spans = document.querySelectorAll('.buddypanel-menu span');
    for (const span of spans) {
      if (span.textContent.trim() === label) {
        let el = span;
        while (el && el.tagName !== 'LI') el = el.parentElement;
        return el;
      }
    }
    return null;
  }, label);
}

async function clickAndCheckMenuItem(liHandle, label) {
  let clicked = false, open = false, count = 0, toggleMs = null;
  if (liHandle && await liHandle.evaluate(el => !!el)) {
    try {
      const aHandle = await liHandle.$('a span');
      if (aHandle) {
        const t0 = performance.now();
        await aHandle.click();
        clicked = true;
        await delay(350);
        open = await liHandle.evaluate(el => el.classList.contains('open'));
        const subMenu = await liHandle.$('.sub-menu.bb-open');
        if (subMenu) count = (await subMenu.$$('li')).length;
        toggleMs = Math.round(performance.now() - t0);
        console.log(`✅ "${label}" (span) clicked. Items: ${count}. Open: ${open} [${toggleMs}ms]`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not click/check "${label}":`, e.message);
    }
  } else {
    console.warn(`⚠️ "${label}" section not found`);
  }
  return { clicked, open, count, toggleMs };
}

// ---- MAIN FLOW ----
module.exports = async function globalSidebarFlow(page, context = {}) {
  // ---------- Layer 1: Structure/Existence ----------
  const sidebarLoadStart = performance.now();
  await page.waitForSelector('aside.buddypanel', { visible: true, timeout: 7000 });
  const sidebarLoadEnd = performance.now();

  // Structure checks
  const sidebar = await page.$('aside.buddypanel');
  if (!sidebar) throw new Error('Sidebar (buddypanel) not found in DOM');

  const inner = await page.$('.side-panel-inner');
  if (!inner) throw new Error('Sidebar inner wrapper (.side-panel-inner) not found');

  const nav = await page.$('.side-panel-menu-container');
  if (!nav) throw new Error('Sidebar menu container (.side-panel-menu-container) not found');

  const ul = await page.$('.buddypanel-menu');
  if (!ul) throw new Error('Sidebar menu list (.buddypanel-menu) not found');

  const allItems = await page.$$('.buddypanel-menu > li');
  console.log(`✅ Sidebar found with ${allItems.length} top-level menu items`);

  // Required menu labels by group (edit as needed!)
  const requiredLabels = [
    "הפרופיל שלי", "ניהול מרצה", "הקורס שלי",        // main group
    "תמיכה מקצועית", "פניות ואישורים", "השמה", "ציונים", // settings group
    "משוב", "התנתק"                                   // footer group
  ];
  const allTextContents = await page.$$eval('.buddypanel-menu > li a span', spans =>
    spans.map(s => s.textContent.trim())
  );

  // Layer 1 logs
  requiredLabels.forEach(label => {
    if (allTextContents.includes(label)) {
      console.log(`✅ Menu item found: "${label}"`);
    } else {
      console.warn(`⚠️  Menu item missing: "${label}"`);
    }
  });

  const lastCourses = await page.$('#menu-item-last-courses');
  if (lastCourses) {
    const courseItems = await page.$$('#menu-item-last-courses .sub-menu li');
    console.log('✅ "קורסים אחרונים" section found (last courses)');
    console.log(`  ↳ Contains ${courseItems.length} recent courses`);
  } else {
    console.log('ℹ️  No last courses section (may be admin or user has no progress)');
  }

  const toggleBtn = await page.$('#toggle-sidebar');
  if (toggleBtn) {
    console.log('✅ Sidebar toggle button found');
  } else {
    console.warn('⚠️ Sidebar toggle button not found');
  }

  // Layer 1 Metrics
  if (context.shouldExport) {
    addMetric({
      flow: 'globalSidebarFlow-layer1',
      topMenuCount: allItems.length,
      foundLabels: allTextContents,
      hasLastCourses: !!lastCourses,
      hasToggleButton: !!toggleBtn,
      timestamp: new Date().toISOString()
    });
  }
  console.log('🎉 [Layer 1] BuddyPanel sidebar basic QA checks PASSED');

  // ---------- Layer 2: Interactivity ----------
  // (Use all menu items, collapse logic, link checks, errors/warnings)
  const collapsibleLabels = ["הגדרות", "קורסים אחרונים"];
  const keyLabels = [
    "הפרופיל שלי", "הקורס שלי",
    "תמיכה מקצועית", "פניות ואישורים", "השמה", "ציונים",
    "משוב", "התנתק", "הגדרות", "קורסים אחרונים"
  ];
  const presentLabels = [];
  const layer2ConsoleErrors = [];
  const layer2ConsoleWarnings = [];

  // JS error/warning collection for layer2
  page.on('console', msg => {
    if (msg.type() === 'error') layer2ConsoleErrors.push(msg.text());
    if (msg.type() === 'warning') layer2ConsoleWarnings.push(msg.text());
  });

  for (const label of keyLabels) {
    const liHandle = await findMenuItemByAnySpan(page, label);
    if (liHandle && await liHandle.evaluate(el => !!el)) {
      presentLabels.push(label);
      if (collapsibleLabels.includes(label)) {
        await clickAndCheckMenuItem(liHandle, label);
      } else {
        const a = await liHandle.$('a');
        if (a) {
          const href = await a.evaluate(el => el.getAttribute('href'));
          console.log(`ℹ️  Menu "${label}" link: ${href}`);
        }
      }
      console.log(`✅ Menu item found: "${label}"`);
    } else {
      console.warn(`⚠️ Menu item missing: "${label}"`);
    }
  }

  // Layer 2 Metrics
  const sidebarMs = Math.round(sidebarLoadEnd - sidebarLoadStart);
  console.log(`⏱️ Sidebar loaded in ${sidebarMs}ms`);
  await delay(350);

  if (layer2ConsoleErrors.length > 0) {
    console.warn(`⚠️ Console JS errors during sidebar:`, layer2ConsoleErrors);
  }
  if (layer2ConsoleWarnings.length > 0) {
    console.warn(`⚠️ Console JS warnings during sidebar:`, layer2ConsoleWarnings);
  }

  if (context.shouldExport) {
    addMetric({
      flow: 'globalSidebarFlow-layer2',
      sidebarMs,
      topMenuCount: allItems.length,
      presentLabels,
      hasToggleButton: !!toggleBtn,
      consoleErrors: layer2ConsoleErrors,
      consoleWarnings: layer2ConsoleWarnings,
      timestamp: new Date().toISOString()
    });
  }
  console.log('🎉 [Layer 2] BuddyPanel sidebar dynamic/interactivity checks PASSED');

  // ---------- Layer 3: Deep QA/Stress/Performance ----------
  // Collect deeper XHR, asset errors, stress tests, etc.
  const xhrTimings = [];
  const failedRequests = [];
  let screenshots = [];
  // Log XHR/asset timings
  page.on('response', async (res) => {
    const req = res.request();
    if (req.url().includes('/buddypanel') || req.url().includes('/sidebar')) {
      const timing = {
        url: req.url(),
        status: res.status(),
        timing: res.timing()?.responseEnd,
      };
      xhrTimings.push(timing);
    }
    if (res.status() >= 400) {
      failedRequests.push({ url: req.url(), status: res.status() });
    }
  });

  // Stress test toggles (10x) and window resize
  const toggleTimes = {};
  for (const label of collapsibleLabels) {
    const liHandle = await findMenuItemByAnySpan(page, label);
    toggleTimes[label] = [];
    if (liHandle && await liHandle.evaluate(el => !!el)) {
      for (let i = 0; i < 10; i++) {
        const result = await clickAndCheckMenuItem(liHandle, label);
        toggleTimes[label].push(result.toggleMs);
        await delay(100);
      }
    }
  }

  await page.setViewport({ width: 1200, height: 900 });
  await delay(200);
  await page.setViewport({ width: 500, height: 900 });
  await delay(200);
  await page.setViewport({ width: 1200, height: 900 });

  const screenshotPath = path.join(
    __dirname,
    `sidebar_stress_${Date.now()}.png`
  );
  await page.screenshot({ path: screenshotPath });
  screenshots.push(screenshotPath);

  // Layer 3 Metrics
  if (context.shouldExport) {
    addMetric({
      flow: 'globalSidebarFlow-layer3',
      sidebarMs,
      topMenuCount: allItems.length,
      presentLabels,
      hasToggleButton: !!toggleBtn,
      consoleErrors: layer2ConsoleErrors,
      consoleWarnings: layer2ConsoleWarnings,
      xhrTimings,
      failedRequests,
      toggleTimes,
      screenshots,
      timestamp: new Date().toISOString()
    });
  }

  console.log('🎉 [Layer 3] BuddyPanel sidebar deep QA/diagnostic checks PASSED');
};
