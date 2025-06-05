const { addMetric } = require("../logger/metricsExporter");
const delay = ms => new Promise(r => setTimeout(r, ms));

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

// --- Modularized Step Functions ---

// UX Step: DOM load and basic buttons
async function loadTicketsPage(page) {
  await page.goto('https://app.digitalschool.co.il/tickets/', { waitUntil: 'domcontentloaded' });
  const domReady = performance.now();
  console.log(`📥 Tickets page DOM loaded in ${domReady.toFixed(0)}ms`);
  await page.waitForSelector('#createTicketBtn');
  await page.waitForSelector('#ticketHistoryBtn');
  const buttonsReady = performance.now();
  return { domReady, buttonsReady };
}

// UX Step: Open ticket form and wait for ACF
async function openTicketForm(page) {
  await page.click('#createTicketBtn');
  await page.waitForSelector('select[name="acf[field_65f06082a4add]"]', { timeout: 5000 });
  const formReady = performance.now();
  console.log(`📄 Form ready in ${formReady.toFixed(0)}ms`);
  return formReady;
}

// UX Step: Test sector/sub-sector dropdown logic (Layer 3 check #1)
async function testSubSectorDropdown(page, context) {
  // This test iterates all sector options and validates sub-sector logic
  const sectorSelect = await page.$('select[name="acf[field_65f06082a4add]"]');
  const sectorOptions = await page.$$eval('select[name="acf[field_65f06082a4add]"] option', opts =>
    opts.map(opt => ({ value: opt.value, label: opt.textContent }))
  );
  for (const sector of sectorOptions) {
    if (!sector.value) continue; // skip placeholder
    await sectorSelect.select(sector.value);
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, 'select[name="acf[field_65f06082a4add]"]');
    await new Promise(r => setTimeout(r, 300)); // Wait for sub-sector update

    // Check sub-sector dropdown state and options
    const subSectorOptions = await page.$$eval('select[name="acf[field_65f064c9a4ae1]"] option', opts =>
      opts.map(opt => ({ value: opt.value, label: opt.textContent.trim() }))
    );
    const isDisabled = await page.$eval('select[name="acf[field_65f064c9a4ae1]"]', el => el.disabled);

    // Layer 3: UX comment: "Sub-sector dropdown must always update and enable/disable appropriately!"
    console.log(
      `🔄 For sector [${sector.label}], sub-sector disabled: ${isDisabled}, options:`,
      subSectorOptions.map(o => o.label)
    );
    if (context.shouldExport) {
      addMetric({
        flow: 'ticketFlow-subsectorDropdown',
        sector: sector.label,
        subSectorDisabled: isDisabled,
        subSectorOptions: subSectorOptions.map(o => o.label),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Step: Wait for default sector/sub-sector logic, select specific option, and validate
async function selectSectorAndSubSector(page) {
  // Wait for sector dropdown options (after form open)
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

  // Wait for sub-sector dropdown
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

  // Pick specific sub-sector by label (as in your flow)
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

  return { sectorSelectMs, subSectorSelectMs };
}



// Step: Type into fields and submit (ACF fields in correct order)
async function fillAndSubmitTicket(page) {
  // 1. Select sector (e.g., 'technical_support')
  await page.waitForSelector('select[name="acf[field_65f06082a4add]"]', { visible: true });
  await page.select('select[name="acf[field_65f06082a4add]"]', 'technical_support');
  await delay(200);

  // 2. Wait for sub-sector, select by label
  await page.waitForFunction(() => {
    const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
    return select && !select.disabled && select.options.length > 1;
  }, { timeout: 5000 });

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
  await delay(250);

  // 3. Title field (always visible)
  await page.waitForSelector('input[name="acf[field_65f060dba4ade]"]', { visible: true });
  await page.click('input[name="acf[field_65f060dba4ade]"]');
  await page.type('input[name="acf[field_65f060dba4ade]"]', 'בדיקת מערכת - כותרת');

  // 4. WYSIWYG (TinyMCE) field
  const content = `בדיקה טכנית - לוודא קליטה תקינה.
זהו שורה שניה.
לינק לבדיקה: https://example.com
סוף בדיקה`;

  let wysiwygSuccess = false;
  try {
    // Always click Visual tab by ID
    await page.waitForSelector('#acf-editor-35-tmce', { visible: true, timeout: 2000 });
    await page.click('#acf-editor-35-tmce');
    await delay(300);

    // Now interact with the correct iframe
    const iframe = await page.waitForSelector('#acf-editor-35_ifr', { visible: true, timeout: 2000 });
    const frame = await iframe.contentFrame();
    await frame.waitForSelector('body', { visible: true, timeout: 1000 });
    await frame.focus('body');
    await frame.type('body', content);
    wysiwygSuccess = true;
    console.log('📄 WYSIWYG content typed into TinyMCE (acf-editor-35_ifr)');
  } catch (err) {
    // Fallback to textarea (text tab)
    await page.waitForSelector('textarea[name="acf[field_65f06191a4adf]"]', { visible: true });
    await page.click('textarea[name="acf[field_65f06191a4adf]"]');
    await page.type('textarea[name="acf[field_65f06191a4adf]"]', content);
    console.log('📄 Textarea content typed (fallback)');
  }

  // 5. Scroll to and submit
  const submitBtn = await page.waitForSelector('input[type="submit"]', { visible: true });
  await submitBtn.evaluate(b => b.scrollIntoView({ behavior: "auto", block: "center" }));
  await delay(200);

  const beforeSubmit = performance.now();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    submitBtn.click(),
  ]);
  const afterSubmit = performance.now();
  const submitMs = Math.round(afterSubmit - beforeSubmit);
  console.log(`📨 Ticket submitted in ${submitMs}ms`);
  return submitMs;
}



/**
 * Layer 3 Modal Open/Close UX + Content Validation
 */
async function testModalOpenClose(page, context) {
  // Show ticket history (table with rows/buttons)
  await page.click('#ticketHistoryBtn');
  await page.waitForSelector('.ticket-row .content-button', { timeout: 5000 });

  const buttons = await page.$$('.ticket-row .content-button');
  let modalMs = 0, modalStatus = 'no-modal', modalContentStatus = 'not-checked';

  if (buttons.length > 0) {
    const modalStart = performance.now();

    await buttons[0].click(); // Open modal
    await page.waitForSelector('.modal', { visible: true, timeout: 5000 });

    // Wait for modal content to settle, then grab inner text & HTML
    await new Promise(r => setTimeout(r, 1000));
    let modalText = '', modalHtml = '';
    try {
      modalText = await page.$eval('.modal .modal-body', el => el.innerText);
      modalHtml = await page.$eval('.modal .modal-body', el => el.innerHTML);
    } catch (e) {
      console.warn('⚠️ Could not extract modal content for validation');
    }

    // Validate: expect text, line break, URL as string or link
    const expectedText = 'בדיקה טכנית - לוודא קליטה תקינה.';
    const expectedSecondLine = 'זהו שורה שניה.';
    const expectedUrl = 'https://example.com';

    if (
      modalText.includes(expectedText) &&
      modalText.includes(expectedSecondLine) &&
      (modalText.includes(expectedUrl) || modalHtml.includes(expectedUrl))
    ) {
      console.log('✅ Modal contains all expected content: text, line break, and URL');
      modalContentStatus = 'valid';
    } else {
      console.warn('❌ Modal missing expected content');
      modalContentStatus = 'invalid';
      console.warn('Modal content was:', modalText);
    }

    // Close modal
    await page.click('.modal .close');
    await page.waitForFunction(() => {
      const m = document.querySelector('.modal');
      return m && (m.classList.contains('hidden') || m.style.display === 'none');
    }, { timeout: 3000 });

    modalMs = performance.now() - modalStart;
    modalStatus = 'success';
    console.log(`📤 Modal open/close took ${Math.round(modalMs)}ms`);
  } else {
    modalStatus = 'no-tickets';
    console.warn('⚠️ No ticket content buttons found for modal test');
  }

  // Add result to metrics
  if (context.shouldExport) {
    addMetric({
      flow: 'ticketFlow-modalUX',
      modalStatus,
      modalMs: Math.round(modalMs),
      modalContentStatus,
      timestamp: new Date().toISOString(),
    });
  }

  return { modalMs, modalStatus, modalContentStatus };
}


async function checkTicketHistoryRows(page, context) {
  await page.click('#ticketHistoryBtn');
  await page.waitForSelector('.ticket-row', { timeout: 5000 });

  // Columns that are allowed to be empty (zero-based)
  const ALLOWED_EMPTY_COLS = [6]; // "משוב" (feedback)

  const rows = await page.$$('.ticket-row');
  let issues = 0;
  for (const [i, row] of rows.entries()) {
    const cells = await row.$$eval('td', tds => tds.map(td => td.textContent.trim()));
    const emptyCols = cells
      .map((txt, idx) => ({ idx, txt }))
      .filter(c => (!c.txt || c.txt === '-') && !ALLOWED_EMPTY_COLS.includes(c.idx));

    if (emptyCols.length > 0) {
      console.warn(`⚠️ Row ${i + 1}: Empty/missing columns:`, emptyCols.map(c => c.idx));
      issues++;
    } else {
      console.log(`✅ Row ${i + 1}: All required fields populated`);
    }
  }
  if (context.shouldExport) {
    addMetric({
      flow: 'ticketFlow-historyRows',
      totalRows: rows.length,
      rowsWithIssues: issues,
      timestamp: new Date().toISOString(),
    });
  }
  if (rows.length === 0) {
    console.warn('⚠️ No ticket rows found');
  }
}


// --- MAIN EXPORT (calls all steps in order) ---
module.exports = async function ticketFlow(page, context = {}) {
  const start = performance.now();
  const xhrMetrics = [];
  setupXHRTracking(page, xhrMetrics);

  try {
    // 1. Page load and buttons (UX: DOM + UI controls must always appear)
    const { domReady, buttonsReady } = await loadTicketsPage(page);

    // 2. Open ticket form and wait for ACF render (UX: form must always show)
    const formReady = await openTicketForm(page);

    // 3. Layer 3 UX: Check sub-sector dropdown logic
    await testSubSectorDropdown(page, context);

    // 4. Continue regular flow: Select sector, sub-sector, etc.
    const { sectorSelectMs, subSectorSelectMs } = await selectSectorAndSubSector(page);

    // 5. Fill and submit form
    const submitMs = await fillAndSubmitTicket(page);

    // 6. Layer 3 UX: Modal test
    const { modalMs, modalStatus, modalContentStatus } = await testModalOpenClose(page, context);

    // 7. Layer 3 UX: Ticket row data completeness test 
    await checkTicketHistoryRows(page, context);

    // 8. XHR metrics & export
    const acfValidationXHR = xhrMetrics.filter(x =>
      x.url.includes('acf/validate_save_post') ||
      (x.url.includes('admin-ajax.php') && x.method === 'POST')
    );
    const slowXHRs = xhrMetrics.filter(x => x.duration > 500);

    // 9. Export metrics
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
        modalStatus,
        modalContentStatus,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (err) {
    console.warn('⚠️ Ticket flow failed:', err.message);
  }
};
