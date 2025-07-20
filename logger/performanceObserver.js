async function setupPerformanceObserver(page) {
    await page.evaluateOnNewDocument(() => {
      // Create a PerformanceObserver to capture various metrics
      const observer = new PerformanceObserver((list) => {
        const perfEntries = list.getEntries();
        for (const entry of perfEntries) {
          // Send data to the backend or process it in the browser as needed
          console.log(`Performance Entry: ${entry.name}`, entry);
        }
      });
  
      // Observe various performance entry types
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'longtask', 'element', 'navigation', 'resource', 'measure', 'mark'] });
    });
  
  }
  
  module.exports = { setupPerformanceObserver };
  