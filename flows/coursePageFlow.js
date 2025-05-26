module.exports = async function coursePageFlow(page) {
    const start = performance.now();
    try {
      await page.goto('https://app.digitalschool.co.il/courses/קורס-ai-live-20-08-23/', { waitUntil: 'domcontentloaded' });
      const domReady = performance.now();
      console.log(`📥 Course page DOM loaded in ${(domReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('.course-content-container');
      const tabsReady = performance.now();
      console.log(`📑 Tabs loaded in ${(tabsReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('.ld-lesson-list', { timeout: 5000 });
      const listReady = performance.now();
      console.log(`📚 Lesson list ready in ${(listReady - start).toFixed(0)}ms`);
  
      await new Promise(r => setTimeout(r, 3000));
      const done = performance.now();
      console.log(`🏁 Total course page wait: ${(done - start).toFixed(0)}ms`);
      if (done - start > 7000) console.warn('⚠️ Page slow (>7s)');

    } catch (err) {
      console.warn('⚠️ Course page failed:', err.message);
    }
  };
  