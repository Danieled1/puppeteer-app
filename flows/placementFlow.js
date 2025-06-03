const { addMetric } = require("../logger/metricsExporter");

const assertVisible = async (page, selector, label) => {
  const found = await page.$(selector);
  if (found) {
    console.log(`✅ ${label} found`);
  } else {
    console.warn(`❌ ${label} NOT found`);
  }
};

module.exports = async function placementFlow(page, context = {}) {
  const flowStart = performance.now();
  const timings = {};

  try {
    const xhrs = [];
    page.on('requestfinished', async request => {
      const url = request.url();
      if (url.includes('admin-ajax.php') || url.includes('/wp-json/')) {
        try {
          const response = await request.response();
          const timing = await response.timing();
          const duration = timing?.receiveHeadersEnd - timing?.startTime;
          if (duration > 500) {
            console.warn(`🐢 Slow XHR [${request.method()}] ${url} → ${Math.round(duration)}ms`);
          }
          xhrs.push({ url, duration });
        } catch (err) {
          console.warn(`⚠️ Could not get timing for ${url}:`, err.message);
        }
      }
    });

    const navStart = performance.now();
    await page.goto('https://app.digitalschool.co.il/placement/', { waitUntil: 'domcontentloaded' });
    timings.domLoad = performance.now() - navStart;
    console.log(`🚀 DOM loaded in ${Math.round(timings.domLoad)}ms`); // 🚀 UX: DOM + readiness

    await assertVisible(page, '.header-placement-title', 'Header title');
    const formCheckStart = performance.now();
    await page.waitForSelector('#acf-form', { timeout: 4000 });
    timings.resumeFormLoad = performance.now() - formCheckStart;
    console.log(`📄 Resume form visible in ${Math.round(timings.resumeFormLoad)}ms`);

    await assertVisible(page, '#resume-label', 'Job status label'); // 🧠 UX: Resume label existence
    await assertVisible(page, '.placement-notes', 'Placement notes section');

    const courseListStart = performance.now();
    await page.waitForSelector('#courses-placement .bb-course-item-wrap', { timeout: 4000 });
    timings.courseListRender = performance.now() - courseListStart;

    const courseItems = await page.$$('#courses-placement .bb-course-item-wrap');
    if (courseItems.length > 0) {
      console.log(`🎯 Found ${courseItems.length} related course(s) in ${Math.round(timings.courseListRender)}ms`);
    } else {
      console.warn('📉 UX: No related job-prep courses found'); // 🧠 UX: Zero course edge case
    }
    
    const totalTime = Math.round(performance.now() - flowStart);
    console.log(`📊 placementFlow completed in ${totalTime}ms`);
    if (totalTime > 7000) {
      console.warn(`⚠️ SLOW PAGE: placement page took ${totalTime}ms to fully render`);
    }
    if (context.shouldExport) {
      addMetric({
        flow: 'placementFlow',
        totalMs: totalTime,
        domMs: Math.round(timings.domLoad),
        resumeFormMs: Math.round(timings.resumeFormLoad),
        courseListMs: Math.round(timings.courseListRender),
        courseCount: courseItems.length,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (err) {
    console.warn('⚠️ placementFlow failed:', err.message);
  }
};
