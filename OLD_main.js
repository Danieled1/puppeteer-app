// main.js
const puppeteer = require('puppeteer');
const { setupXHRLogger } = require('./logger/loggerXHR');
const summarizeXHR = require('./logger/xhr-summary');
const { clearXHRLogs } = require('./logger/loggerXHR');

const loginFlow = require('./flows/loginFlow');
const coursesFlow = require('./flows/coursesFlow');
const coursePageFlow = require('./flows/coursePageFlow')
const lessonPageFlow = require('./flows/lessonPageFlow')
const ticketFlow = require('./flows/ticketFlow');
const placementFlow = require('./flows/placementFlow');
const gradesFlow = require('./flows/gradesFlow');
const supportFlow = require('./flows/supportFlow');

(async () => {
  clearXHRLogs();

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--disable-cache', '--disk-cache-size=0'],
  });
  const page = await browser.newPage();

  await setupXHRLogger(page);
  await loginFlow(page);
  await coursesFlow(page);
  await coursePageFlow(page)
  await lessonPageFlow(page)
  await ticketFlow(page);
  await placementFlow(page);
  await gradesFlow(page);
  await supportFlow(page);

  summarizeXHR();
  console.log('✅ All flows done. Closing browser.');
  await browser.close();
})();
