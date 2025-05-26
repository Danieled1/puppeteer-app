module.exports = async function loginFlow(page) {
    await page.goto('https://app.digitalschool.co.il/wp-login.php', { waitUntil: 'networkidle2' });
    await page.type('#user_login', 'test_live_student', { delay: 100 });
    await page.type('#user_pass', 'test_live_student', { delay: 100 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#wp-submit'),
    ]);
    console.log('✅ Logged in. Current URL:', page.url());
  };