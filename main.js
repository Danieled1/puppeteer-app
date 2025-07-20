#!/usr/bin/env node
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const { setupXHRLogger, clearXHRLogs } = require('./logger/loggerXHR');
const summarizeXHR = require('./logger/xhr-summary');
const { flushMetrics } = require('./logger/metricsExporter');

// Load flows dynamically
const flows = {
  login: require('./flows/loginFlow'),
  globalSidebar: require('./flows/globalTemplate/globalSidebarFlow'),
  globalHeader: require('./flows/globalTemplate/globalHeaderFlow'),
  courses: require('./flows/coursesFlow'),
  coursePage: require('./flows/coursePageFlow'),
  lessonPage: require('./flows/lessonPageFlow'),
  ticket: require('./flows/ticketFlow'),
  ticketPerf : require('./flows/ticketFlow/ticketFlow-perf'),
  ticketPerfNavigation: require('./flows/ticketFlow/ticketFlow-perf-navigation'),
  placement: require('./flows/placementFlow'),
  grades: require('./flows/gradesFlow'),
  support: require('./flows/supportFlow'),
  ticketEmptyStateFlow: require('./flows/ticketEmptyStateFlow'),

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
  login                → Test login UX and duration
  courses              → Load courses page and count cards
  coursePage           → Load course overview page
  lessonPage           → Open lesson and video playback
  ticket               → Open and submit a ticket
  ticketPerf           → Performance test for ticket flow
  globalSidebar        → Test global sidebar visibility
  globalHeader         → Test global header visibility
  placement            → Test placement form readiness
  grades               → Load grades and test AJAX
  support              → Test support page visibility
  ticketEmptyStateFlow → Test ticket table empty state (zero tickets)


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
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://app.digitalschool.co.il/',
  });
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
