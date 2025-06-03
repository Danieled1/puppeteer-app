// logger/metricsExporter.js
const fs = require('fs');
const path = require('path');

const metrics = [];

function addMetric(entry) {
  metrics.push(entry);
}

function flushMetrics() {
  if (metrics.length === 0) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `${timestamp}-report`;
  const dir = path.join(__dirname, '../exports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // JSON
  const jsonPath = path.join(dir, `${baseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

  // CSV
  const csvHeader = Object.keys(metrics[0]).join(',');
  const csvRows = metrics.map(row => Object.values(row).join(',')).join('\n');
  const csvPath = path.join(dir, `${baseName}.csv`);
  fs.writeFileSync(csvPath, `${csvHeader}\n${csvRows}`);

  console.log(`📁 Exported report:\n → ${jsonPath}\n → ${csvPath}`);
}

module.exports = { addMetric, flushMetrics };
