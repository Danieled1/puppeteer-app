const fs = require('fs');
const path = require('path');

function summarizeXHR() {
  try {
    const summaryFilePath = path.join(__dirname, 'logs', 'xhr-summary.txt');

    if (!fs.existsSync(summaryFilePath)) {
      console.log('ℹ️ No summary file found. Skipping XHR summary.');
      return;
    }

    const summaryLog = fs.readFileSync(summaryFilePath, 'utf8');
    const lines = summaryLog.trim().split('\n');
    const grouped = lines.reduce((acc, line) => {
      const key = line.split(':')[0];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log('\n📊 XHR Summary:');
    for (const key in grouped) {
      console.log(`${key.trim()}: ${grouped[key]}`);
    }
  } catch (e) {
    console.warn('⚠️ Could not summarize XHR logs:', e.message);
  }
}

module.exports = summarizeXHR;
