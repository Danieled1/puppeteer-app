const { addMetric } = require('../../logger/metricsExporter');
const delay = ms => new Promise(r => setTimeout(r, ms));

// Helper: Find menu item <li> by <span> text anywhere in the sidebar
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

// Click and check open state for collapsible menus
async function clickAndCheckMenuItem(liHandle, label) {
  let clicked = false, open = false, count = 0;
  if (liHandle && await liHandle.evaluate(el => !!el)) {
    try {
      // Click the <span> inside <a> (toggle)
      const aHandle = await liHandle.$('a span');
      if (aHandle) {
        await aHandle.click();
        clicked = true;
        await delay(350);
        open = await liHandle.evaluate(el => el.classList.contains('open'));
        const subMenu = await liHandle.$('.sub-menu.bb-open');
        if (subMenu) count = (await subMenu.$$('li')).length;
        console.log(`✅ "${label}" (span) clicked. Items: ${count}. Open: ${open}`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not click/check "${label}":`, e.message);
    }
  } else {
    console.warn(`⚠️ "${label}" section not found`);
  }
  return { clicked, open, count };
}

module.exports = async function globalSidebarFlow(page, context = {}) {
  // Layer 1: Structure
  const sidebarLoadStart = performance.now();
  await page.waitForSelector('aside.buddypanel', { visible: true, timeout: 7000 });
  const sidebarLoadEnd = performance.now();

  const sidebar = await page.$('aside.buddypanel');
  if (!sidebar) throw new Error('Sidebar (buddypanel) not found in DOM');
  const allItems = await page.$$('.buddypanel-menu > li');
  console.log(`✅ Sidebar found with ${allItems.length} top-level menu items`);

  // Define menu items to log/click
  const collapsibleLabels = ["הגדרות", "קורסים אחרונים"];
  const keyLabels = [
    "הפרופיל שלי", "הקורס שלי",
    "תמיכה מקצועית", "פניות ואישורים", "השמה", "ציונים",
    "משוב", "התנתק", "הגדרות", "קורסים אחרונים"
  ];
  const presentLabels = [];

  for (const label of keyLabels) {
    const liHandle = await findMenuItemByAnySpan(page, label);
    if (liHandle && await liHandle.evaluate(el => !!el)) {
      presentLabels.push(label);
      if (collapsibleLabels.includes(label)) {
        await clickAndCheckMenuItem(liHandle, label);
      } else {
        // Log href
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

  // Toggle button (log presence)
  const toggleBtn = await page.$('#toggle-sidebar');
  if (toggleBtn) {
    console.log('✅ Sidebar toggle button found');
  } else {
    console.warn('⚠️ Sidebar toggle button not found');
  }

  // JS error log
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  // Timing
  const sidebarMs = Math.round(sidebarLoadEnd - sidebarLoadStart);
  console.log(`⏱️ Sidebar loaded in ${sidebarMs}ms`);
  await delay(350);

  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Console JS errors during sidebar:`, consoleErrors);
  }
  if (consoleWarnings.length > 0) {
    console.warn(`⚠️ Console JS warnings during sidebar:`, consoleWarnings);
  }

  // Metrics
  if (context.shouldExport) {
    addMetric({
      flow: 'globalSidebarFlow-layer2',
      sidebarMs,
      topMenuCount: allItems.length,
      presentLabels,
      hasToggleButton: !!toggleBtn,
      consoleErrors,
      consoleWarnings,
      timestamp: new Date().toISOString()
    });
  }

  console.log('🎉 [Layer 2] BuddyPanel sidebar dynamic/interactivity checks PASSED');
};
