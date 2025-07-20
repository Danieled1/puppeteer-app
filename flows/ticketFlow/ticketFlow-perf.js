const puppeteer = require('puppeteer');
const { addMetric } = require('../../logger/metricsExporter');
const { delay } = require('../../utils/delay');

async function ticketFlowPerf(page) {
    // 1. Ensure login landed on user dashboard
    await page.waitForSelector('a.bb-menu-item[data-balloon="הפרופיל שלי"]', { visible: true, timeout: 15000 });
    console.log('Cookies after login:', await page.cookies());
    console.log('At user dashboard URL:', await page.url());

    // 2. Wait extra for all background processing
    await delay(1500);

    // 3. Extract the actual /tickets/ sidebar link (after hydration)
    const ticketUrl = await page.evaluate(() => {
        const el = document.querySelector('a.bb-menu-item[data-balloon="פניות ואישורים"]');
        return el ? el.href : null;
    });
    if (!ticketUrl) throw new Error('Sidebar tickets link missing!');
    console.log('DEBUG: Extracted tickets URL:', ticketUrl);

    // 4. Navigate directly via page.goto (not .click!) for BuddyBoss MPA
    await page.goto(ticketUrl, { waitUntil: 'networkidle2' });
    console.log('After page.goto(), current URL:', await page.url());

    // 5. Wait for the unique marker of tickets page
    await page.waitForSelector('#createTicketBtn', { visible: true, timeout: 15000 });


    // Debug: Print resulting URL
    console.log('After click, page URL:', await page.url());

    // === Performance metrics logic unchanged ===
    const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0];
        return {
            FCP: nav ? nav.firstContentfulPaint : 0,
            DOMContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
            FullLoad: nav ? nav.loadEventEnd : 0,
            LCP: lcpEntry ? lcpEntry.renderTime || lcpEntry.loadTime : 0,
        };
    });

    // Step 6: Calculate TTI (simplified)
    const tti = await page.evaluate(() => {
        return new Promise(resolve => {
            if ('PerformanceLongTaskTiming' in window) {
                new PerformanceObserver(entryList => {
                    const lastLongTask = entryList.getEntries()[0];
                    resolve(lastLongTask ? lastLongTask.startTime + lastLongTask.duration : performance.timeOrigin + performance.now());
                }).observe({ type: 'longtask', buffered: true });
            } else {
                resolve(performance.timeOrigin + performance.now());
            }
        });
    });
    metrics.TTI = tti;

    // Step 7: Waterfall Data (Resource Timing)
    const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(entry => ({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            initiatorType: entry.initiatorType
        }));
    });

    const ajaxRequests = resources.filter(resource => resource.initiatorType === 'xmlhttprequest');

    // Step 8: Output Results
    console.log('→ FCP:', metrics.FCP / 1000, 's');
    console.log('→ DOMContentLoaded:', metrics.DOMContentLoaded / 1000, 's');
    console.log('→ Full Load:', metrics.FullLoad / 1000, 's');
    console.log('→ LCP:', metrics.LCP / 1000, 's');
    console.log('→ TTI:', (metrics.TTI - performance.timeOrigin) / 1000, 's');
    console.log('→ Resources:', resources);
    console.log('→ Ajax Requests:', ajaxRequests);
    // Export Metrics
    Object.entries(metrics).forEach(([name, value]) => {
        addMetric(`ticketsPage.${name}`, value / 1000); // Convert to seconds
    });
    addMetric(`ticketsPage.ajaxRequests`, ajaxRequests.length);
}

module.exports = ticketFlowPerf;
