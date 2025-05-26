const assertVisible = async (page, selector, label) => {
    const found = await page.$(selector);
    if (found) {
      console.log(`✅ ${label} found`);
    } else {
      console.warn(`❌ ${label} NOT found`);
    }
  };
  
  module.exports = async function supportFlow(page) {
    const flowStart = performance.now();
    const timings = {};
  
    try {
      const navStart = performance.now();
      await page.goto('https://app.digitalschool.co.il/technical-support-guide/', {
        waitUntil: 'domcontentloaded',
      });
      timings.domLoad = performance.now() - navStart;
      console.log(`🛠️ DOM loaded in ${Math.round(timings.domLoad)}ms`);
  
      // Visible elements
      await assertVisible(page, '.header-title', 'Support header title');
      await assertVisible(page, '.support-button', 'Support form button');
  
      const totalTime = performance.now() - flowStart;
      console.log(`✅ supportFlow completed in ${Math.round(totalTime)}ms`);
  
      if (totalTime > 5000) {
        console.warn(`⚠️ SLOW PAGE: support page took ${Math.round(totalTime)}ms`);
      }
  
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.warn('⚠️ Support guide flow failed:', err.message);
    }
  };
  