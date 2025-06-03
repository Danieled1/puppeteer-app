const { addMetric } = require("../logger/metricsExporter");

/**
 * Adds a listener for all relevant XHR/fetch/REST calls during the flow.
 * Captures timings for acf/validate_save_post and related admin-ajax actions.
 */
function setupXHRTracking(page, xhrMetrics = []) {
  page.on('requestfinished', async (request) => {
    const url = request.url();
    if (
      url.includes('admin-ajax.php') ||
      url.includes('/wp-json/') ||
      url.includes('acf/validate_save_post')
    ) {
      try {
        const response = await request.response();
        const timing = await response.timing();
        const duration = timing ? timing.receiveHeadersEnd - timing.startTime : -1;
        xhrMetrics.push({
          url,
          method: request.method(),
          status: response.status(),
          duration,
        });
        if (duration > 500) {
          console.warn(`🐢 Slow XHR [${request.method()}] ${url} → ${Math.round(duration)}ms`);
        }
      } catch (err) {
        console.warn(`⚠️ Could not get XHR timing for ${url}:`, err.message);
      }
    }
  });
}

module.exports = async function ticketFlow(page, context = {}) {
  const start = performance.now();
  const xhrMetrics = [];
  setupXHRTracking(page, xhrMetrics);

  try {
    // 1. Load page and buttons
    await page.goto('https://app.digitalschool.co.il/tickets/', { waitUntil: 'domcontentloaded' });
    const domReady = performance.now();
    console.log(`📥 Tickets page DOM loaded in ${(domReady - start).toFixed(0)}ms`);

    await page.waitForSelector('#createTicketBtn');
    await page.waitForSelector('#ticketHistoryBtn');
    const buttonsReady = performance.now();

    // 2. Open ticket form and wait for ACF form render
    await page.click('#createTicketBtn');
    const openFormStart = performance.now();
    await page.waitForSelector('select[name="acf[field_65f06082a4add]"]', { timeout: 5000 });
    const formReady = performance.now();
    console.log(`📄 Form ready in ${(formReady - start).toFixed(0)}ms`);
    
    // 3. Wait for sector options and sub-sector logic
    const sectorStart = performance.now();
    const sectorOptions = await page.$$eval('select[name="acf[field_65f06082a4add]"] option', opts =>
      opts.map(opt => ({ value: opt.value, label: opt.textContent }))
    );
    const sectorOptionsReady = performance.now();
    console.log('🌐 ticket_sector options:', sectorOptions);

    await page.select('select[name="acf[field_65f06082a4add]"]', 'technical_support');
    await page.evaluate(() => {
      const el = document.querySelector('select[name="acf[field_65f06082a4add]"]');
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const sectorSelectMs = sectorOptionsReady - sectorStart;
    console.log(`🔧 Sector dropdown loaded in ${sectorSelectMs.toFixed(0)}ms`);

    const subSectorStart = performance.now();
    await page.waitForFunction(() => {
      const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
      return select && !select.disabled && select.options.length > 1;
    }, { timeout: 5000 });
    const subSectorOptions = await page.$$eval('select[name="acf[field_65f064c9a4ae1]"] option', opts =>
      opts.map(opt => ({ value: opt.value, label: opt.textContent.trim() }))
    );
    const subSectorOptionsReady = performance.now();
    const subSectorSelectMs = subSectorOptionsReady - subSectorStart;
    console.log('🌐 ticket_sector_subject options:', subSectorOptions);
    console.log(`🔧 Sub-sector dropdown loaded in ${subSectorSelectMs.toFixed(0)}ms`);

    await page.evaluate(() => {
      const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
      const labelToPick = 'שגיאה בקוד';
      for (const option of select.options) {
        if (option.textContent.trim() === labelToPick) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    console.log('✅ Sub-sector selected (by label)');

    // 4. Type into fields (simulate user)
    await page.type('input[name="acf[field_65f060dba4ade]"]', 'בדיקה אוטומטית');
    await page.type('textarea[name="acf[field_65f06191a4adf]"]', 'בדיקה טכנית - לוודא קליטה תקינה.');
    console.log('📄 Content typed');

    // 5. Submit the form and track time
    const beforeSubmit = performance.now();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"]'),
    ]);
    const afterSubmit = performance.now();
    const submitMs = Math.round(afterSubmit - beforeSubmit);
    console.log(`📨 Ticket submitted in ${submitMs}ms`);

    // 6. Open ticket history and test modal
    await page.click('#ticketHistoryBtn');
    await page.waitForSelector('.ticket-row .content-button', { timeout: 5000 });
    const modalStart = performance.now();
    const buttons = await page.$$('.ticket-row .content-button');
    let modalMs = 0;
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForSelector('.modal', { visible: true, timeout: 5000 });
      await new Promise(r => setTimeout(r, 1000));
      await page.click('.modal .close');
      await page.waitForFunction(() => {
        const m = document.querySelector('.modal');
        return m && m.classList.contains('hidden');
      }, { timeout: 3000 });
      modalMs = performance.now() - modalStart;
      console.log(`📤 Modal open/close took ${modalMs.toFixed(0)}ms`);
    }

    // 7. Collate XHR metrics
    const acfValidationXHR = xhrMetrics.filter(x =>
      x.url.includes('acf/validate_save_post') ||
      (x.url.includes('admin-ajax.php') && x.method === 'POST')
    );
    const slowXHRs = xhrMetrics.filter(x => x.duration > 500);

    // 8. Export metrics
    const end = performance.now();
    const totalTime = Math.round(end - start);
    if (totalTime > 9000) {
      console.warn(`⚠️ SLOW PAGE: ticket page took ${totalTime}ms to fully render`);
    }
    if (context.shouldExport) {
      addMetric({
        flow: 'ticketFlow',
        totalMs: totalTime,
        domMs: Math.round(domReady - start),
        buttonsReadyMs: Math.round(buttonsReady - start),
        formReadyMs: Math.round(formReady - start),
        sectorSelectMs: Math.round(sectorSelectMs),
        subSectorSelectMs: Math.round(subSectorSelectMs),
        submitMs,
        modalMs: Math.round(modalMs),
        acfValidationXHR: acfValidationXHR.map(x => Math.round(x.duration)),
        slowXHRCount: slowXHRs.length,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (err) {
    console.warn('⚠️ Ticket flow failed:', err.message);
  }
};
