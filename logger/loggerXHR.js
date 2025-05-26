// loggerXHR.js
const fs = require('fs');
const path = require('path');
const logDir = path.join(__dirname, 'logs');
const fullLogPath = path.join(logDir, 'xhr-full-log.txt');
const summaryLogPath = path.join(logDir, 'xhr-summary.txt');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

if (!fs.existsSync(fullLogPath)) {
    fs.writeFileSync(fullLogPath, '', 'utf8');
}
if (!fs.existsSync(summaryLogPath)) {
    fs.writeFileSync(summaryLogPath, '', 'utf8');
}

function clearXHRLogs() {
    fs.writeFileSync(fullLogPath, '', 'utf8');
    fs.writeFileSync(summaryLogPath, '', 'utf8');
    console.log("clearXHRLogs cleaned - 🧼");
}

function logXHRFull(message) {
    console.log("logXHRFull received - ", message);
    fs.appendFileSync(fullLogPath, `${message}\n`, 'utf8');
}

function logXHRSummary(message) {
    console.log("logXHRSummary received - ", message);
    fs.appendFileSync(summaryLogPath, `${message}\n`, 'utf8');
}
async function setupXHRLogger(page) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const url = request.url();
        const type = request.resourceType();
        const isXHR = type === 'xhr' || type === 'fetch' || url.includes('admin-ajax.php') || url.includes('wp-json');
        if (isXHR) logXHRFull(`🔄 ${request.method()} ${url}`);
        request.continue();
    });
    page.on('response', async (res) => {
        const url = res.url();
        const status = res.status();
        const type = res.request().resourceType();
        const isXHR = type === 'xhr' || type === 'fetch' || url.includes('admin-ajax.php') || url.includes('wp-json');
        if (!isXHR) return;
        logXHRFull(`📥 [${status}] ${url}`);
        if (status >= 400) logXHRSummary(`❌ ${status} → ${url}`);
        else if (url.includes('/plugins/')) logXHRSummary(`🧩 Plugin AJAX: ${url.split('/plugins/')[1].split('?')[0]}`);
        else if (url.includes('/themes/')) logXHRSummary(`🎨 Theme AJAX: ${url.split('/themes/')[1].split('?')[0]}`);
        else if (url.includes('wp-json')) logXHRSummary(`🌐 REST: ${url.split('wp-json')[1].split('?')[0]}`);
        else if (url.includes('admin-ajax.php')) {
            try {
                const postData = res.request().postData();
                const actionMatch = /action=([^&]+)/.exec(postData || '');
                const action = actionMatch ? actionMatch[1] : 'unknown';
                logXHRSummary(`🧠 admin-ajax: action=${action}`);
            } catch (e) {
                logXHRSummary(`🧠 admin-ajax: action=error`);
            }
        }
        try {
            const timing = res.timing?.();
            if (timing) {
                const duration = timing.receiveHeadersEnd - timing.sendStart;
                if (duration > 500) {
                    logXHRSummary(`🐢 Slow XHR (${duration}ms): ${url}`);
                }
            }
        } catch (e) {
            console.warn("Error occurde with timinig -", e.message)
        }
    });
}
module.exports = {
    clearXHRLogs,
    logXHRFull,
    logXHRSummary,
    setupXHRLogger
};
