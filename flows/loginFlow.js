const { addMetric } = require('../logger/metricsExporter');
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeWithClear(page, selector, text, delayMs = 100) {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector); // Activate field
  await page.focus(selector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.value = '';
  }, selector);
  await delay(200); // Let the DOM catch up

  for (const char of text) {
    await page.type(selector, char, { delay: delayMs });
  }
}


module.exports = async function loginFlow(page, context = {}) {
  const flowStart = performance.now();

  // Phase 1: Initial page load
  await page.goto('https://app.digitalschool.co.il/wp-login.php', { waitUntil: 'domcontentloaded' });
  const domLoaded = performance.now();
  console.log(`📥 Login page DOM loaded in ${(domLoaded - flowStart).toFixed(0)}ms`);

  // Phase 2: Safe typing
  await typeWithClear(page, '#user_login', 'test_live_student');
  await typeWithClear(page, '#user_pass', 'test_live_student');

  
  


  // Phase 3: Login action (only this should be measured for login processing)
  const submitStart = performance.now();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('#wp-submit'),
  ]);
  const submitEnd = performance.now();

  const totalTime = Math.round(submitEnd - flowStart);
  const domTime = Math.round(domLoaded - flowStart);
  const submitTime = Math.round(submitEnd - submitStart);

  console.log(`✅ Logged in. Submit Duration: ${submitTime}ms. Total Flow: ${totalTime}ms. URL: ${page.url()}`);

  if (submitTime > 4000) {
    console.warn(`⚠️ SLOW LOGIN PROCESSING: took ${submitTime}ms`);
  }

  if (context.shouldExport) {
    addMetric({
      flow: 'loginFlow',
      totalMs: totalTime,
      domMs: domTime,
      loginProcessingMs: submitTime,
      timestamp: new Date().toISOString(),
    });
  }
};
