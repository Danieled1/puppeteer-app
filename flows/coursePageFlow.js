const { addMetric } = require("../logger/metricsExporter");

module.exports = async function coursePageFlow(page, context = {}) {
    const start = performance.now();
    try {
      await page.goto('https://app.digitalschool.co.il/courses/קורס-ai-live-20-08-23/', { waitUntil: 'domcontentloaded' });
      const domReady = performance.now();
      console.log(`📥 Course page DOM loaded in ${(domReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('.course-content-container');
      const tabsReady = performance.now();
      console.log(`📑 Tabs loaded in ${(tabsReady - start).toFixed(0)}ms`); // 📑 UX: Tab readiness latency
  
      await page.waitForSelector('.ld-lesson-list', { timeout: 5000 });
      const listReady = performance.now();
      console.log(`📚 Lesson list ready in ${(listReady - start).toFixed(0)}ms`); // 📚 UX: Lesson list appearance
  
      // 🧠 UX: Visual stability observation (flicker, jumps)
      await new Promise(r => setTimeout(r, 3000));
      const end = performance.now();
      const totalTime = Math.round(end - start);
      console.log(`🏁 Total course page wait: ${totalTime}ms`);
      if (totalTime > 7000) {
        console.warn(`⚠️ SLOW PAGE: course page took ${totalTime}ms to fully render`);
      }      

      if (context?.shouldExport) {
        addMetric({
          flow: 'coursePage',
          totalMs: totalTime,
          domMs: Math.round(domReady - start),
          tabsReadyMs: Math.round(tabsReady - start),
          lessonListMs: Math.round(listReady - start),
          timestamp: new Date().toISOString()
        });
      }

    } catch (err) {
      console.warn('⚠️ Course page failed:', err.message);
    }
  };
