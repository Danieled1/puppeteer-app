module.exports = async function lessonPageFlow(page) {
    const start = performance.now();
    try {
      await page.goto('https://app.digitalschool.co.il/courses/קורס-ai-live-20-08-23/lessons/mordi-fullstack-20-08-2023-חלק-ב-שיעור-1/', { waitUntil: 'domcontentloaded' });
      const domReady = performance.now();
      console.log(`📥 Lesson page DOM loaded in ${(domReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('iframe, video', { timeout: 8000 });
      const playerReady = performance.now();
      console.log(`🎥 Video/player ready in ${(playerReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('#learndash-course-header .bb-ld-info-bar');
      const sidebarReady = performance.now();
      console.log(`🧭 Sidebar info loaded in ${(sidebarReady - start).toFixed(0)}ms`);
  
      await new Promise(r => setTimeout(r, 3000));
      const done = performance.now();
      console.log(`🏁 Total lesson page wait: ${(done - start).toFixed(0)}ms`);
      if (done - start > 7000) console.warn('⚠️ Page slow (>7s)');

    } catch (err) {
      console.warn('⚠️ Lesson page failed:', err.message);
    }
  };
  