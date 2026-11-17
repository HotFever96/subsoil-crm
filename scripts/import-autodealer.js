const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const sourcePath = 'C:/Users/user/.gemini/antigravity/brain/16cd28f3-9727-43c3-9e6b-48539b115a2e/browser_sandbox/downloads/2026-11-17.xlsx';
const backupDir = 'C:/Users/user/.gemini/antigravity/scratch/subsoil-crm/public/backups';

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 1. Save persistent backup copy
const backupFilePath = path.join(backupDir, 'autodealer_clients_backup_2026-11-17.xlsx');
fs.copyFileSync(sourcePath, backupFilePath);
console.log('Persistent backup saved to:', backupFilePath);

// 2. Parse workbook
const workbook = xlsx.readFile(sourcePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Total rows loaded:', rows.length);

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11) {
    const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  return String(raw).trim();
}

const parsedClients = rows.map((r, idx) => {
  const isLegal = r['Тип клиента'] === 'ЮЛ' || Boolean(r['ИНН'] && String(r['ИНН']).length === 10);
  const name = (r['Наименование для документов'] || r['Наименование в программе'] || '').trim();

  // Find phone across contact persons
  let phone = '';
  for (let c = 1; c <= 6; c++) {
    for (let k = 1; k <= 3; k++) {
      const val = r[`Контактная персона[${c}].Контакты[${k}].Значение`];
      if (val && !phone) {
        phone = normalizePhone(val);
      }
    }
  }

  // Find vehicles
  const vehicles = [];
  for (let v = 1; v <= 30; v++) {
    const make = (r[`Автомобиль[${v}].Марка`] || '').trim();
    const model = (r[`Автомобиль[${v}].Модель`] || '').trim();
    const plate = (r[`Автомобиль[${v}].Госномер`] || '').trim();
    const vin = (r[`Автомобиль[${v}].VIN`] || '').trim();
    const year = parseInt(r[`Автомобиль[${v}].Год выпуска`], 10) || 0;
    if (make || model || plate || vin) {
      vehicles.push({
        make: make || 'Автомобиль',
        model: model || '',
        licensePlate: plate.replace(/\s+/g, '').toUpperCase(),
        vin: vin.replace(/\s+/g, '').toUpperCase(),
        year: year || 2018,
        mileage: 0,
      });
    }
  }

  return {
    id: 'ad-' + (r['Идентификатор'] || idx + 1),
    name: name || `Клиент #${idx + 1}`,
    type: isLegal ? 'legal' : 'individual',
    phone: phone || '',
    inn: r['ИНН'] ? String(r['ИНН']).trim() : undefined,
    kpp: r['КПП'] ? String(r['КПП']).trim() : undefined,
    ogrn: r['ОГРН'] ? String(r['ОГРН']).trim() : undefined,
    address: r['Юридический адрес'] || r['Фактический адрес'] || '',
    note: r['Примечание'] || '',
    vehicles,
    totalOrdersCount: 0,
    totalSpent: 0,
  };
}).filter((c) => c.name.length > 0);

console.log('Parsed valid clients:', parsedClients.length);
const totalVehicles = parsedClients.reduce((sum, c) => sum + c.vehicles.length, 0);
console.log('Total vehicles associated:', totalVehicles);

// Save parsed JSON backup as well
const jsonBackupPath = path.join(backupDir, 'autodealer_clients_backup_2026-11-17.json');
fs.writeFileSync(jsonBackupPath, JSON.stringify(parsedClients, null, 2), 'utf8');
console.log('JSON backup saved to:', jsonBackupPath);

// Output sample
console.log('Sample client with car:');
console.log(JSON.stringify(parsedClients.find(c => c.vehicles.length > 0), null, 2));
