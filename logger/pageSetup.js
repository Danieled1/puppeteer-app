async function disableCacheForPatterns(page, patterns) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (patterns.some(pattern => request.url().includes(pattern))) {
            request.respond({
                status: 200,
                body: 'disabled cache', // Dummy body
                headers: {
                    'Cache-Control': 'no-store'
                }
            });
        } else {
            request.continue();
        }
    });
}

module.exports = { disableCacheForPatterns };
