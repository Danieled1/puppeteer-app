#!/usr/bin/env node
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const { setupXHRLogger, clearXHRLogs } = require('./logger/loggerXHR');
const summarizeXHR = require('./logger/xhr-summary');
const { flushMetrics } = require('./logger/metricsExporter');

// Load flows dynamically
const flows = {
  login: require('./flows/loginFlow'),
  courses: require('./flows/coursesFlow'),
  coursePage: require('./flows/coursePageFlow'),
  lessonPage: require('./flows/lessonPageFlow'),
  ticket: require('./flows/ticketFlow'),
  placement: require('./flows/placementFlow'),
  grades: require('./flows/gradesFlow'),
  support: require('./flows/supportFlow'),
};

(async () => {
  const args = minimist(process.argv.slice(2));
  const selectedFlows = args._;
  const shouldExport = true; 
  const context = { shouldExport };

  if (selectedFlows.length === 0 || selectedFlows.includes('help') || args.help || args.h) {
    console.log(`
📘 Usage: npm start -- <flow1> <flow2> ...

Available flows:
  login         → Test login UX and duration
  courses       → Load courses page and count cards
  coursePage    → Load course overview page
  lessonPage    → Open lesson and video playback
  ticket        → Open and submit a ticket
  placement     → Test placement form readiness
  grades        → Load grades and test AJAX
  support       → Test support page visibility

Examples:
  npm start -- login
  npm start -- login grades
  npm run audit
    `);
    process.exit(0);
  }

  clearXHRLogs();
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--disable-cache', '--disk-cache-size=0'],
  });

  const page = await browser.newPage();
  await setupXHRLogger(page);

  for (const flowName of selectedFlows) {
    if (!flows[flowName]) {
      console.warn(`❌ Skipping unknown flow: ${flowName}`);
      continue;
    }
    console.log(`🚀 Running flow: ${flowName}`);
    await flows[flowName](page, context);
  }

  summarizeXHR();
  if (shouldExport) flushMetrics();
  await browser.close();
})();
