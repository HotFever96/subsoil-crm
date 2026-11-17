const fs = require('fs');
const path = require('path');
const browserOutputsDir = 'C:/Users/user/.gemini/antigravity/brain/5710b357-0de6-4918-89ee-6633891969e9/browser_sandbox/outputs';

const orderFiles = [
  'step_637.json',
  'step_639.json',
  'step_641.json',
  'step_646.json',
  'step_648.json',
  'step_650.json',
];

const allRows = [];
const keyCount = {};

orderFiles.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(browserOutputsDir, f), 'utf8'));
  const rows = data?.value?.rows || [];
  rows.forEach(r => {
    if (!r || !r[0]) return;
    const num = r[0];
    const date = r[2];
    const yearMatch = date ? date.match(/\d{4}/) : null;
    const year = yearMatch ? yearMatch[0] : '2026';
    const key = `${year}-${num}`;
    keyCount[key] = (keyCount[key] || 0) + 1;
    allRows.push(r);
  });
});

console.log('Total order rows across files:', allRows.length);
console.log('Unique order (year + num) count:', Object.keys(keyCount).length);

let dupes = 0;
const rawNumCount = {};
allRows.forEach(r => {
  rawNumCount[r[0]] = (rawNumCount[r[0]] || 0) + 1;
});
Object.entries(rawNumCount).forEach(([k, c]) => {
  if (c > 1) dupes++;
});
console.log('Order numbers appearing in multiple years or pages:', dupes);
