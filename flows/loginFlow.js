module.exports = async function loginFlow(page) {
  const start = performance.now(); // ⏱️ UX: Start login timer
  await page.goto('https://app.digitalschool.co.il/wp-login.php', { waitUntil: 'networkidle2' });
  await page.type('#user_login', 'test_live_student', { delay: 100 }); // 🧠 UX: Form responsiveness
  await page.type('#user_pass', 'test_live_student', { delay: 100 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('#wp-submit'),
  ]);
  const end = performance.now(); // ⏱️ UX: Login duration
  console.log(`✅ Logged in. Duration: ${(end - start).toFixed(0)}ms. Current URL:`, page.url());
};