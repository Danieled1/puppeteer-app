const assertVisible = async (page, selector, label) => {
    const found = await page.$(selector);
    if (found) {
      console.log(`✅ ${label} found`);
    } else {
      console.warn(`❌ ${label} NOT found`);
    }
  };
  
  module.exports = async function gradesFlow(page) {
    const flowStart = performance.now();
    const timings = {};
  
    try {
      // Listen for XHRs (especially the grades fetch)
      const xhrs = [];
      page.on('requestfinished', async request => {
        const url = request.url();
        if (url.includes('admin-ajax.php')) {
          const postData = request.postData();
          const actionMatch = /action=([^&]+)/.exec(postData || '')?.[1] || 'unknown';
      
          try {
            const response = await request.response();
            const timing = await response.timing();
            const duration = timing ? timing.receiveHeadersEnd - timing.startTime : -1;
      
            if (duration > 500) {
              console.warn(`🐢 Slow XHR [${actionMatch}] took ${Math.round(duration)}ms`);
            }
      
          } catch (err) {
            console.warn(`⚠️ Could not get response timing for action=${actionMatch}`);
          }
        }
      });
      
  
      const navStart = performance.now();
      await page.goto('https://app.digitalschool.co.il/grades/', { waitUntil: 'domcontentloaded' });
      timings.domLoad = performance.now() - navStart;
      console.log(`📥 DOM loaded in ${Math.round(timings.domLoad)}ms`);
  
      // Base assertions
      await assertVisible(page, '#gradesTable', 'Grades table');
      await assertVisible(page, '.user-name-grades', 'Student name');
      await assertVisible(page, '#resume-label', 'Job status label');
  
      // Check table rows loaded
      const rowLoadStart = performance.now();
      await page.waitForSelector('#gradesTable tr', { timeout: 4000 });
      timings.rowLoad = performance.now() - rowLoadStart;
  
      const rowCount = await page.$$eval('#gradesTable tr', rows => rows.length);
      if (rowCount > 0) {
        console.log(`📈 Grades table has ${rowCount} row(s) in ${Math.round(timings.rowLoad)}ms`);
      } else {
        console.warn(`📉 Grades table is empty`);
      }
  
      const totalTime = performance.now() - flowStart;
      console.log(`🕒 gradesFlow completed in ${Math.round(totalTime)}ms`);
  
      if (totalTime > 7000) {
        console.warn(`⚠️ SLOW PAGE: grades page took ${Math.round(totalTime)}ms`);
      }
  
      // Summarize slow XHRs
      const slowXHRs = xhrs.filter(x => x.duration > 500);
      if (slowXHRs.length > 0) {
        console.log('📡 XHR Summary:');
        slowXHRs.forEach(x => console.log(` • ${x.action}: ${Math.round(x.duration)}ms`));
      }
  
    } catch (err) {
      console.warn('⚠️ gradesFlow failed:', err.message);
    }
  };
  