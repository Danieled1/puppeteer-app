const { addMetric } = require('../../logger/metricsExporter');
const delay = ms => new Promise(r => setTimeout(r, ms));

async function assertVisible(page, selector, label, required = true) {
  const element = await page.$(selector);
  if (element) {
    console.log(`✅ ${label} visible`);
    return true;
  } else if (required) {
    console.warn(`❌ ${label} NOT found (required)`);
    return false;
  } else {
    console.log(`ℹ️ ${label} not found (optional)`);
    return true;
  }
}

async function clickAndCheckDropdown(page, selector, label) {
  const trigger = await page.$(selector);
  if (!trigger) {
    console.log(`ℹ️ ${label} trigger not found`);
    return { clicked: false, success: false };
  }

  const t0 = performance.now();
  try {
    await trigger.click();
    await delay(500);
    const expanded = await page.$(`${selector} .sub-menu, .bb-dropdown, .bb-open`);
    const t1 = performance.now();
    if (expanded) {
      console.log(`✅ ${label} dropdown opened in ${Math.round(t1 - t0)}ms`);
      return { clicked: true, success: true, ms: Math.round(t1 - t0) };
    } else {
      console.warn(`❌ ${label} clicked but no dropdown found`);
      return { clicked: true, success: false };
    }
  } catch (err) {
    console.warn(`⚠️ Failed to interact with ${label}: ${err.message}`);
    return { clicked: false, success: false };
  }
}

module.exports = async function globalHeaderFlow(page, context = {}) {
  const flowStart = performance.now();
  console.log('🧱 Starting Layer 1 + 2 + 3: globalHeaderFlow');

  const consoleErrors = [], consoleWarnings = [], xhrMetrics = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  page.on('requestfinished', async req => {
    const url = req.url();
    if (url.includes('notifications') || url.includes('messages')) {
      try {
        const res = await req.response();
        const status = res.status();
        const timing = await res.timing();
        const duration = timing.receiveHeadersEnd - timing.startTime;
        xhrMetrics.push({ url, status, duration });
      } catch {}
    }
  });

  // Measure header load time
  const headerStart = performance.now();
  await page.waitForSelector('.site-header-container', { visible: true });
  const headerReady = performance.now();
  const headerLoadTime = Math.round(headerReady - headerStart);
  console.log(`⏱️ Header container loaded in ${headerLoadTime}ms`);

  // --- Layer 1: Structure Checks ---
  const checks = [];
  checks.push(await assertVisible(page, 'header#masthead', 'Header wrapper'));
  checks.push(await assertVisible(page, '.site-header-container', 'Header container'));
  checks.push(await assertVisible(page, '#site-logo .bb-logo', 'Logo'));
  checks.push(await assertVisible(page, '.bb-toggle-panel', 'Sidebar toggle'));
  checks.push(await assertVisible(page, '.site-navigation', 'Navigation menu', false));
  checks.push(await assertVisible(page, '#header-aside', 'Header aside container'));
  checks.push(await assertVisible(page, '.user-wrap', 'User avatar/profile block', false));
  checks.push(await assertVisible(page, '#header-notifications-dropdown-elem', 'Notifications icon', false));
  checks.push(await assertVisible(page, '#header-messages-dropdown-elem', 'Messages icon', false));
  checks.push(await assertVisible(page, '.header-search-link', 'Search icon', false));
  checks.push(await assertVisible(page, '.header-maximize-link', 'Maximize button', false));
  checks.push(await assertVisible(page, '.header-minimize-link', 'Minimize button', false));

  // --- Layer 2: Interactivity ---
  const dropdownTimings = [];
  const interactivityResults = {};

  if (await page.$('.user-wrap')) {
    const result = await clickAndCheckDropdown(page, '.user-wrap', 'Profile');
    interactivityResults.profile = result;
    if (result.ms) dropdownTimings.push(result.ms);
  }

  if (await page.$('#header-notifications-dropdown-elem')) {
    const result = await clickAndCheckDropdown(page, '#header-notifications-dropdown-elem', 'Notifications');
    interactivityResults.notifications = result;
    if (result.ms) dropdownTimings.push(result.ms);
  }

  if (await page.$('#header-messages-dropdown-elem')) {
    const result = await clickAndCheckDropdown(page, '#header-messages-dropdown-elem', 'Messages');
    interactivityResults.messages = result;
    if (result.ms) dropdownTimings.push(result.ms);
  }

  if (await page.$('.header-search-link')) {
    try {
      await page.click('.header-search-link');
      console.log('🔍 Search icon clicked');
      interactivityResults.search = { clicked: true };
    } catch (err) {
      interactivityResults.search = { clicked: false, error: err.message };
    }
  }

  if (await page.$('.header-maximize-link')) {
    await page.click('.header-maximize-link');
    await delay(300);
    const hasToggle = await page.evaluate(() =>
      document.body.classList.contains('course-fullscreen')
    );
    interactivityResults.maximize = { toggled: hasToggle };
  }

  // --- Layer 3: Visual/Functional Integrity ---
  const errors = [];
  const warnings = [];

  // Logo source check
  const logoSrc = await page.$eval('#site-logo .bb-logo', el => el.getAttribute('src') || '');
  if (!logoSrc || logoSrc.trim() === '') errors.push('🛑 Logo is missing or has no src');

  // Header remains fixed
  await page.evaluate(() => window.scrollTo(0, 200));
  const headerVisible = await page.evaluate(() => {
    const el = document.querySelector('header#masthead');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom > 50;
  });
  if (!headerVisible) errors.push('🛑 Header not fixed or scrolled out');

  // Submenu is visible
  const dropdownVisible = await page.evaluate(() => {
    const el = document.querySelector('.user-wrap .sub-menu');
    return el && el.offsetHeight > 0;
  });
  if (!dropdownVisible) errors.push('🛑 User dropdown submenu is hidden or collapsed');

  // Check dropdown menu has links
  const userLinksCount = await page.$$eval('.bb-my-account-menu a', els => els.length);
  if (userLinksCount === 0) errors.push('🛑 User dropdown contains no nav links');

  // Dark mode toggle applies class
  const originalClass = await page.evaluate(() => document.body.className);
  try {
    await page.click('.sfwd-dark-mode');
    await delay(300);
    const newClass = await page.evaluate(() => document.body.className);
    if (originalClass === newClass) warnings.push('⚠️ Dark mode clicked but no class change');
  } catch {
    warnings.push('⚠️ Dark mode toggle not clickable');
  }

  // Body shouldn't be locked
  const bodyLocked = await page.evaluate(() =>
    document.body.classList.contains('no-scroll') || document.body.classList.contains('locked')
  );
  if (bodyLocked) errors.push('🛑 Body has no-scroll or locked class after load');

  // Excessive XHR
  if (xhrMetrics.length > 5)
    warnings.push(`⚠️ High header-side XHR usage: ${xhrMetrics.length} calls`);

  const flowEnd = performance.now();

  if (context.shouldExport) {
    addMetric({
      flow: 'globalHeaderFlow-layer3',
      totalMs: Math.round(flowEnd - flowStart),
      headerLoadTime,
      dropdownTimings,
      interactivityResults,
      consoleErrors,
      consoleWarnings,
      xhrMetrics,
      layer3Errors: errors,
      layer3Warnings: warnings,
      timestamp: new Date().toISOString(),
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Layer 3 PASSED: header layout + functionality verified');
  } else {
    console.warn(`⚠️ Layer 3 completed with ${errors.length} error(s), ${warnings.length} warning(s)`);
    errors.forEach(e => console.error(e));
    warnings.forEach(w => console.warn(w));
  }

  console.log('🎯 globalHeaderFlow complete');
};
