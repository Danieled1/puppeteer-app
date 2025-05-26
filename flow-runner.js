#!/usr/bin/env node
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const { setupXHRLogger, clearXHRLogs } = require('./logger/loggerXHR');
const summarizeXHR = require('./logger/xhr-summary');

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
  const selected = args._[0];

  if (!selected || selected === 'help' || args.help || args.h) {
    console.log(`
📘 Usage: npm start -- <flow>

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
  npm start -- ticket
  npm start -- help
    `);
    process.exit(0);
  }

  if (!flows[selected]) {
    console.error(`❌ Unknown flow: "${selected}" — try "npm start -- help"`);
    process.exit(1);
  }

  clearXHRLogs();
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--disable-cache', '--disk-cache-size=0'],
  });

  const page = await browser.newPage();
  await setupXHRLogger(page);

  console.log(`🚀 Running flow: ${selected}`);
  await flows[selected](page);

  summarizeXHR();
  await browser.close();
})();
