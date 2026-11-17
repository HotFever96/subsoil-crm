const xlsx = require('xlsx');

const wb = xlsx.readFile('./public/backups/autodealer_repair_orders_2026-11-17.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total rows:', rows.length);
console.log('Row 1 (headers):', rows[1]);

let emptyDates = 0;
let validDates = 0;
let dateExamples = [];

for (let i = 2; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  const val = row[0];
  if (!val) {
    emptyDates++;
  } else {
    validDates++;
    if (dateExamples.length < 10) {
      dateExamples.push({ rowIdx: i, val, type: typeof val, orderNum: row[1] });
    }
  }
}

console.log('Empty dates count:', emptyDates, 'Valid dates count:', validDates);
console.log('Date examples:', dateExamples);
