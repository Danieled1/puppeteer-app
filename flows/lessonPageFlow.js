const { addMetric } = require("../logger/metricsExporter");

module.exports = async function lessonPageFlow(page, context = {}) {
    const start = performance.now();
    try {
      await page.goto('https://app.digitalschool.co.il/courses/קורס-ai-live-20-08-23/lessons/mordi-fullstack-20-08-2023-חלק-ב-שיעור-1/', { waitUntil: 'domcontentloaded' });
      const domReady = performance.now();
      console.log(`📥 Lesson page DOM loaded in ${(domReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('iframe, video', { timeout: 8000 });
      const playerReady = performance.now();
      console.log(`🎥 Video/player ready in ${(playerReady - start).toFixed(0)}ms`); // 🎥 UX: Player iframe render time
  
      await page.waitForSelector('#learndash-course-header .bb-ld-info-bar');
      const sidebarReady = performance.now();
      console.log(`🧭 Sidebar info loaded in ${(sidebarReady - start).toFixed(0)}ms`); // 🧭 UX: Sidebar readiness
  
      // 🐢 UX: Slow video detection is handled in XHR logs
      // 🧠 UX: Buffering or playback delay would be tested interactively
      await new Promise(r => setTimeout(r, 3000));
      const end = performance.now();
      const totalTime = Math.round(end - start);

      console.log(`🏁 Total lesson page wait: ${totalTime}ms`);
      if (totalTime > 7000) {
        console.warn(`⚠️ SLOW PAGE: lesson page took ${totalTime}ms to fully render`);
      }
      
      if (context.shouldExport) {
        addMetric({
          flow: 'lessonPage',
          totalMs: totalTime,
          domMs: Math.round(domReady - start),
          playerMs: Math.round(playerReady - start),
          sidebarMs: Math.round(sidebarReady - start),
          timestamp: new Date().toISOString(),
        });
      }

    } catch (err) {
      console.warn('⚠️ Lesson page failed:', err.message);
    }
  };
  