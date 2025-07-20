require('dotenv').config();
const { addMetric } = require('../logger/metricsExporter');

const username = process.env.TEST_USERNAME;
const password = process.env.TEST_PASSWORD;
// const username = process.env.POWER_USERNAME;
// const password = process.env.POWER_PASSWORD;


async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//Our main test user: test_live_student
// no tickets user: student_testing5
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
  // Mimic a real user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );
  // Phase 1: Initial page load
  await page.goto('https://app.digitalschool.co.il/wp-login.php', { waitUntil: 'domcontentloaded' });
  const domLoaded = performance.now();
  console.log(`📥 Login page DOM loaded in ${(domLoaded - flowStart).toFixed(0)}ms`);

  // Phase 2: Safe typing
  await typeWithClear(page, '#user_login', username);
  await typeWithClear(page, '#user_pass', password);





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
  console.log('🔎 After login, current URL:', page.url());
  await delay(1000); // Try a 1 second pause

  if (submitTime > 4000) {
    console.warn(`⚠️ SLOW LOGIN PROCESSING: took ${submitTime}ms`);
  }

  // After successful login:
  if (username === process.env.POWER_USERNAME) {
    // Replace this with the correct slug for the admin user
    await page.goto('https://app.digitalschool.co.il/members/supportecomschool-co-il/', { waitUntil: 'networkidle2' });
  }
  // Place this at the very end, after login and any post-login navigation:
  const cookies = await page.cookies();
  console.log('Session cookies:', cookies);
  if (context) context.cookies = cookies;

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
