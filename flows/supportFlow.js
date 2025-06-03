const assertVisible = async (page, selector, label) => {
    const found = await page.$(selector);
    if (found) {
      console.log(`✅ ${label} found`);
    } else {
      console.warn(`❌ ${label} NOT found`);
    }
  };
  
  module.exports = async function supportFlow(page, context= {}) {
    const flowStart = performance.now();
    const timings = {};
  
    try {
      const navStart = performance.now();
      await page.goto('https://app.digitalschool.co.il/technical-support-guide/', {
        waitUntil: 'domcontentloaded',
      });
      timings.domLoad = performance.now() - navStart;
      console.log(`🛠️ DOM loaded in ${Math.round(timings.domLoad)}ms`); // 🛠️ UX: DOM load time
  
      await assertVisible(page, '.header-title', 'Support header title');
      await assertVisible(page, '.support-button', 'Support form button'); // 🧠 UX: Form trigger visibility
  
      // 🧭 UX: Scroll responsiveness and external redirect testing can be done in Layer 4
  
      const totalTime = Math.round(performance.now() - flowStart);
      console.log(`✅ supportFlow completed in ${totalTime}ms`);
      if (totalTime > 5000) {
        console.warn(`⚠️ SLOW PAGE: support page took ${totalTime}ms to fully render`);
      }
      
      if (context.shouldExport) {
        addMetric({
          flow: 'supportFlow',
          totalMs: totalTime,
          domMs: Math.round(timings.domLoad),
          timestamp: new Date().toISOString(),
        });
      }
      
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.warn('⚠️ supportFlow failed:', err.message);
    }
  };
  