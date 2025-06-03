const { addMetric } = require("../logger/metricsExporter");


module.exports = async function coursesFlow(page, context = {}) {
  const url = 'https://app.digitalschool.co.il/members/test_live_student/courses/';
  const start = performance.now(); // ⏱️ UX: Start timing

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const domLoaded = performance.now();
    console.log(`📥 DOM content loaded in ${(domLoaded - start).toFixed(0)}ms`); // ⏱️ UX: DOM load time

    await page.waitForSelector('.bb-course-item-wrap');
    const selectorReady = performance.now();
    console.log(`✅ First course card ready in ${(selectorReady - start).toFixed(0)}ms`); // 🧠 UX: First visible item

    const courseCount = await page.$$eval('.bb-course-item-wrap', cards => cards.length);
    console.log(`🎓 Found ${courseCount} courses rendered`); // 📊 UX: Course count accuracy

    await new Promise(r => setTimeout(r, 3000)); // 🧠 UX: Scroll responsiveness
    const end = performance.now();
    const totalTime = Math.round(end -start)
    console.log(`🏁 Total page load wait: ${totalTime}ms`);
    if (totalTime > 7000) {
      console.warn(`⚠️ SLOW PAGE: courses page took ${totalTime}ms to fully render`);
    }
    if (context?.shouldExport) {
      addMetric({
        flow: 'courses',
        totalMs: totalTime,
        domMs: Math.round(domLoaded - start),
        firstCardMs: Math.round(selectorReady - start),
        courseCount,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('⚠️ Courses page failed:', err.message);
  }
};
