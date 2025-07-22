// ticketFlowPerf.js

const { delay } = require('../../utils/delay');
const { execSync } = require('child_process');
const cookiesToCurlString = require('../../utils/cookiesToCurlString');
const os = require('os');
const fs = require('fs');
const path = require('path');

async function ticketFlowPerf(page, context = {}) {
    // --- CONTEXT ---
    const dequeued_group = process.env.DEQUEUED_GROUP || 'NONE';
    const handles_removed = process.env.HANDLES_REMOVED || '';
    const safeGroup = dequeued_group.replace(/[^a-z0-9]/gi, '_');
    const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
    const RESULTS_JSON_PATH = path.join(__dirname, `../../exports/dequeue-perf-${safeGroup}-${nowStr}.json`);

    // 1. Ensure login landed on user dashboard
    await page.waitForSelector('a.bb-menu-item[data-balloon="הפרופיל שלי"]', { visible: true, timeout: 15000 });
    await delay(1500);

    // 2. Fetch cache headers (optional for debugging)
    const cookies = context.cookies;
    if (cookies) {
        const curlCookies = cookiesToCurlString(cookies);
        let cacheCmd = `curl -I "https://app.digitalschool.co.il/tickets/" -b "${curlCookies}"`;
        cacheCmd += os.platform().startsWith('win') ? ' | findstr /i cache' : ' | grep -i cache';
        try {
            const cacheResult = execSync(cacheCmd, { encoding: 'utf8' });
            console.log('Cache headers for logged-in user:\n', cacheResult);
        } catch (err) {
            console.warn('Failed to fetch cache headers with curl:', err.message);
        }
    } else {
        throw new Error('No cookies in context!');
    }

    // 3. Extract /tickets/ link
    const ticketUrl = await page.evaluate(() => {
        const el = document.querySelector('a.bb-menu-item[data-balloon="פניות ואישורים"]');
        return el ? el.href : null;
    });
    if (!ticketUrl) throw new Error('Sidebar tickets link missing!');
    await page.goto(ticketUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#createTicketBtn', { visible: true, timeout: 15000 });

    // 4. Perf metrics
    const metrics = await page.evaluate(() => {
        let FCP = 0, LCP = 0;
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) FCP = fcpEntry.startTime;
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries && lcpEntries.length > 0) {
            const lcp = lcpEntries[lcpEntries.length - 1];
            LCP = lcp.startTime || lcp.renderTime || lcp.loadTime || 0;
        }
        console.log('LCP Entries:', lcpEntries); // Debug information to console
        // Check if LCP was recorded at all
        if (LCP === 0) {
            console.warn('LCP was not recorded.');
        }

        const nav = performance.getEntriesByType('navigation')[0];
        return {
            FCP,
            DOMContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
            FullLoad: nav ? nav.loadEventEnd : 0,
            LCP
        };
    });

    // 5. TTI (Time to Interactive)
    let tti = 0;
    try {
        tti = await page.evaluate(() => {
            return new Promise(resolve => {
                if ('PerformanceLongTaskTiming' in window) {
                    new PerformanceObserver(entryList => {
                        const entries = entryList.getEntries();
                        const lastLongTask = entries[entries.length - 1];
                        resolve(lastLongTask ? lastLongTask.startTime + lastLongTask.duration : performance.now());
                    }).observe({ type: 'longtask', buffered: true });
                } else {
                    resolve(performance.now());
                }
            });
        });
    } catch (err) { tti = 0; }
    metrics.TTI = tti;

    // 6. Resource/Network stats
    const resources = await page.evaluate(() =>
        performance.getEntriesByType('resource').map(entry => ({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            initiatorType: entry.initiatorType,
            transferSize: entry.transferSize || 0
        }))
    );
    const ajaxRequests = resources.filter(resource => resource.initiatorType === 'xmlhttprequest');
    const total_bytes = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0);

    // 7. Baseline (for time saved)
    let baseline;
    const BASELINE_FILE = path.join(__dirname, '../../exports/dequeue-baseline.json');
    if (fs.existsSync(BASELINE_FILE)) {
        baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    } else {
        baseline = metrics;
        fs.writeFileSync(BASELINE_FILE, JSON.stringify(metrics, null, 2));
    }
    function delta(val, base) { return base && val ? (base - val) / 1000 : 0; }
    const cumulative_time_saved_s = {
        FCP: delta(metrics.FCP, baseline.FCP),
        LCP: delta(metrics.LCP, baseline.LCP),
        DOMContentLoaded: delta(metrics.DOMContentLoaded, baseline.DOMContentLoaded),
        FullLoad: delta(metrics.FullLoad, baseline.FullLoad)
    };

    // 8. Build result object
    const result = {
        timestamp: new Date().toISOString(),
        dequeued_group,
        handles_removed,
        FCP_s: (metrics.FCP / 1000).toFixed(3),
        LCP_s: (metrics.LCP / 1000).toFixed(3),
        DOMContentLoaded_s: (metrics.DOMContentLoaded / 1000).toFixed(3),
        FullLoad_s: (metrics.FullLoad / 1000).toFixed(3),
        TTI_s: (metrics.TTI / 1000).toFixed(3),
        ResourceCount: resources.length,
        AjaxRequests: ajaxRequests.length,
        total_bytes: total_bytes,
        cumulative_time_saved_s: cumulative_time_saved_s,
        notes: ''
    };

    // 9. Write result as an array to unique JSON file
    fs.writeFileSync(RESULTS_JSON_PATH, JSON.stringify([result], null, 2));
    console.log(`Perf data for group "${dequeued_group}" saved to:`, RESULTS_JSON_PATH);
}

module.exports = ticketFlowPerf;
