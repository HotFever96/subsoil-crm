const fs = require('fs');
const path = require('path');
const browserOutputsDir = 'C:/Users/user/.gemini/antigravity/brain/5710b357-0de6-4918-89ee-6633891969e9/browser_sandbox/outputs';

const invoiceFiles = ['step_623.json', 'step_588.json', 'step_590.json', 'step_592.json'];
const allRows = [];
const numberCount = {};

invoiceFiles.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(browserOutputsDir, f), 'utf8'));
  const rows = data?.value?.rows || [];
  rows.forEach(r => {
    if (!r || !r[0]) return;
    const num = r[0];
    const date = r[1];
    const key = `${num} (${date})`;
    numberCount[key] = (numberCount[key] || 0) + 1;
    allRows.push(r);
  });
});

console.log('Total invoice rows across files:', allRows.length);
console.log('Unique invoice (number + date) count:', Object.keys(numberCount).length);

// Sample first 10 and last 10 unique invoices
const keys = Object.keys(numberCount);
console.log('First 5:', keys.slice(0, 5));
console.log('Last 5:', keys.slice(-5));
