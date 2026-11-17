const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/user/.gemini/antigravity/brain/5710b357-0de6-4918-89ee-6633891969e9/browser_sandbox/outputs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let orderSteps = [];
let invoiceSteps = [];

files.forEach(f => {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const rows = d?.value?.rows;
    if (Array.isArray(rows) && rows.length > 5) {
      const first = rows[0] ? rows[0][0] : '';
      const last = rows[rows.length - 1] ? rows[rows.length - 1][0] : '';
      const item = { file: f, length: rows.length, first, last, intent: d.intent || '' };
      if (first.startsWith('ЗН') || first.startsWith('Договор') || last.startsWith('ЗН') || last.startsWith('Договор')) {
        orderSteps.push(item);
      } else if (first.startsWith('СЧ') || last.startsWith('СЧ')) {
        invoiceSteps.push(item);
      } else {
        console.log('Other table:', item);
      }
    }
  } catch {}
});

console.log('--- Order Steps ---');
console.log(orderSteps);
console.log('--- Invoice Steps ---');
console.log(invoiceSteps);
