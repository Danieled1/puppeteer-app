const { addMetric } = require("../logger/metricsExporter");

/**
 * Ticket Empty State Flow
 * - Assumes user credentials are set for a user with zero tickets
 * - Checks that the "לא נמצאו פניות" empty state message is shown in ticket history
 * - Exports result as a Layer 3 UX metric
 */
module.exports = async function ticketEmptyStateFlow(page, context = {}) {
  const start = performance.now();

  try {
    // Go to tickets page and show history
    await page.goto('https://app.digitalschool.co.il/tickets/', { waitUntil: 'domcontentloaded' });
    const domReady = performance.now();

    await page.waitForSelector('#ticketHistoryBtn');
    await page.click('#ticketHistoryBtn');
    await page.waitForSelector('.ticket-history', { visible: true, timeout: 5000 });

    // Wait a little for table rendering
    await new Promise(r => setTimeout(r, 500));

    // Check for empty state row
    const foundEmptyMsg = await page.evaluate(() => {
      const row = document.querySelector('.ticket-history tbody tr');
      return !!(row && row.textContent.includes('לא נמצאו פניות'));
    });

    if (foundEmptyMsg) {
      console.log('✅ Empty state message found: לא נמצאו פניות');
    } else {
      console.warn('❌ Empty state missing! Table may be broken or tickets exist.');
    }

    // Export metric
    if (context.shouldExport) {
      addMetric({
        flow: 'ticketEmptyStateFlow',
        emptyMsgFound: foundEmptyMsg,
        domMs: Math.round(domReady - start),
        totalMs: Math.round(performance.now() - start),
        timestamp: new Date().toISOString(),
      });
    }

    return foundEmptyMsg;

  } catch (err) {
    console.warn('⚠️ ticketEmptyStateFlow failed:', err.message);
    if (context.shouldExport) {
      addMetric({
        flow: 'ticketEmptyStateFlow',
        emptyMsgFound: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
    return false;
  }
};
