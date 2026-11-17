const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const downloadsDir = 'C:/Users/user/.gemini/antigravity/brain/16cd28f3-9727-43c3-9e6b-48539b115a2e/browser_sandbox/downloads';
const backupDir = 'C:/Users/user/.gemini/antigravity/scratch/subsoil-crm/public/backups';

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 1. Copy original Excel files
const fileMappings = [
  { src: '2026-11-17.xlsx', dest: 'autodealer_clients_backup_2026-11-17.xlsx' },
  { src: 'xlsx', dest: 'autodealer_repair_orders_2026-11-17.xlsx' },
  { src: 'xlsx_1', dest: 'autodealer_warehouse_stock_2026-11-17.xlsx' },
  { src: '2026-11-17_1.xlsx', dest: 'autodealer_nomenclature_2026-11-17.xlsx' },
  { src: '2026-11-17_2.xlsx', dest: 'autodealer_works_catalog_2026-11-17.xlsx' },
];

fileMappings.forEach(({ src, dest }) => {
  const srcPath = path.join(downloadsDir, src);
  const destPath = path.join(backupDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest} (${fs.statSync(destPath).size} bytes)`);
  }
});

// Helper for phone normalization
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

// 2. Parse Clients & Vehicles
const clientsWb = xlsx.readFile(path.join(backupDir, 'autodealer_clients_backup_2026-11-17.xlsx'));
const clientsSheet = clientsWb.Sheets[clientsWb.SheetNames[0]];
const clientRows = xlsx.utils.sheet_to_json(clientsSheet);

const clientsMap = new Map();
const vinToVehicleMap = new Map();

clientRows.forEach((r, idx) => {
  const isLegal = r['Тип клиента'] === 'ЮЛ' || Boolean(r['ИНН'] && String(r['ИНН']).length === 10);
  const name = (r['Наименование для документов'] || r['Наименование в программе'] || '').trim();
  if (!name) return;

  let phone = '';
  for (let c = 1; c <= 6; c++) {
    for (let k = 1; k <= 3; k++) {
      const val = r[`Контактная персона[${c}].Контакты[${k}].Значение`];
      if (val && !phone) {
        phone = normalizePhone(val);
      }
    }
  }

  const vehicles = [];
  for (let v = 1; v <= 30; v++) {
    const make = (r[`Автомобиль[${v}].Марка`] || '').trim();
    const model = (r[`Автомобиль[${v}].Модель`] || '').trim();
    const plate = (r[`Автомобиль[${v}].Госномер`] || '').trim();
    const vin = (r[`Автомобиль[${v}].VIN`] || '').trim();
    const year = parseInt(r[`Автомобиль[${v}].Год выпуска`], 10) || 0;
    if (make || model || plate || vin) {
      const vObj = {
        make: make || 'Автомобиль',
        model: model || '',
        licensePlate: plate.replace(/\s+/g, '').toUpperCase(),
        vin: vin.replace(/\s+/g, '').toUpperCase(),
        year: year || 2018,
        mileage: 0,
      };
      vehicles.push(vObj);
      if (vObj.vin) vinToVehicleMap.set(vObj.vin, vObj);
      if (vObj.licensePlate) vinToVehicleMap.set(vObj.licensePlate, vObj);
    }
  }

  const clientObj = {
    id: 'ad-' + (r['Идентификатор'] || idx + 1),
    name,
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
    username: 'antonv',
  };

  clientsMap.set(name.toLowerCase(), clientObj);
});

console.log('Total clients indexed:', clientsMap.size);

// 3. Parse Repair Orders
const ordersWb = xlsx.readFile(path.join(backupDir, 'autodealer_repair_orders_2026-11-17.xlsx'));
const ordersSheet = ordersWb.Sheets[ordersWb.SheetNames[0]];
const orderRawRows = xlsx.utils.sheet_to_json(ordersSheet, { header: 1 });

// Header is at row index 1
const orderHeaders = orderRawRows[1] || [];
const orders = [];

for (let i = 2; i < orderRawRows.length; i++) {
  const row = orderRawRows[i];
  if (!row || !row[1]) continue; // Column 1 is Номер документа

  const dateStr = String(row[0] || '17.11.2026').trim();
  const orderNumber = String(row[1]).trim();
  const clientName = String(row[2] || 'Клиент').trim();
  const make = String(row[3] || '').trim();
  const model = String(row[4] || '').trim();
  const vin = String(row[5] || '').trim().toUpperCase();

  const grandTotal = Math.round(parseFloat(row[6]) || 0);
  const worksTotal = Math.round(parseFloat(row[7]) || 0);
  const partsTotal = Math.round(parseFloat(row[8]) || 0);
  const masterPay = Math.round(parseFloat(row[15]) || 0);

  // Link to client info
  const clientKey = clientName.toLowerCase();
  const matchedClient = clientsMap.get(clientKey);

  // Match vehicle plate if available
  let licensePlate = '';
  if (vin && vinToVehicleMap.has(vin)) {
    licensePlate = vinToVehicleMap.get(vin).licensePlate;
  }

  // Parse date into YYYY-MM-DD
  let formattedDate = '2026-11-17';
  if (dateStr && dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const orderItem = {
    id: `ad-ro-${orderNumber.replace(/[^a-zA-Z0-9]/g, '') || i}`,
    orderNumber,
    createdAt: formattedDate,
    status: 'closed', // History orders are closed/completed
    client: {
      id: matchedClient?.id || `c-${i}`,
      name: clientName,
      phone: matchedClient?.phone || '',
      type: matchedClient?.type || (clientName.includes('ООО') || clientName.includes('АО') ? 'legal' : 'individual'),
      inn: matchedClient?.inn || undefined,
      address: matchedClient?.address || '',
    },
    vehicle: {
      make: make || (matchedClient?.vehicles?.[0]?.make || 'Автомобиль'),
      model: model || (matchedClient?.vehicles?.[0]?.model || ''),
      licensePlate: licensePlate || (matchedClient?.vehicles?.[0]?.licensePlate || 'Б/Н'),
      vin: vin || (matchedClient?.vehicles?.[0]?.vin || ''),
      year: 2018,
      mileage: 0,
      complaints: 'Техническое обслуживание и ремонт по заказ-наряду',
    },
    works: [
      {
        id: `w-${i}-1`,
        name: `Выполненные работы по заказ-наряду ${orderNumber}`,
        mechanic: 'Мастер смены',
        laborHours: 1.0,
        ratePerHour: worksTotal > 0 ? worksTotal : 2850,
        discountPercent: 0,
        total: worksTotal > 0 ? worksTotal : (grandTotal - partsTotal),
      },
    ],
    parts: partsTotal > 0 ? [
      {
        id: `p-${i}-1`,
        oem: 'AUTO-PARTS',
        name: `Запасные части и расходные материалы по ${orderNumber}`,
        qty: 1,
        unit: 'компл',
        purchasePrice: Math.round(partsTotal * 0.7),
        salePrice: partsTotal,
        total: partsTotal,
      },
    ] : [],
    worksTotal: worksTotal > 0 ? worksTotal : (grandTotal - partsTotal),
    partsTotal,
    grandTotal,
    recommendations: 'Рекомендации по дальнейшей эксплуатации зафиксированы в истории обслуживания',
    username: 'antonv',
  };

  orders.push(orderItem);

  // Update client statistics
  if (matchedClient) {
    matchedClient.totalOrdersCount += 1;
    matchedClient.totalSpent += grandTotal;
  }
}

console.log('Total real repair orders parsed:', orders.length);

// 4. Parse Warehouse Stock
const warehouseWb = xlsx.readFile(path.join(backupDir, 'autodealer_warehouse_stock_2026-11-17.xlsx'));
const warehouseSheet = warehouseWb.Sheets[warehouseWb.SheetNames[0]];
const warehouseRows = xlsx.utils.sheet_to_json(warehouseSheet, { header: 1 });

const warehouseParts = [];
for (let i = 2; i < warehouseRows.length; i++) {
  const row = warehouseRows[i];
  if (!row || !row[1]) continue; // Name is in col 1

  const name = String(row[1]).trim();
  const unit = String(row[2] || 'шт').trim();
  const qty = parseInt(row[3], 10) || 0;
  const reserve = parseInt(row[4], 10) || 0;
  const stockSum = parseFloat(row[5]) || 0;
  const salePrice = Math.round(parseFloat(row[7]) || (stockSum > 0 && qty > 0 ? stockSum / qty * 1.3 : 500));
  const purchasePrice = Math.round(qty > 0 && stockSum > 0 ? stockSum / qty : salePrice * 0.7);

  if (name) {
    warehouseParts.push({
      id: `wh-${i}`,
      oem: `AD-OEM-${i}`,
      name,
      category: 'Запчасти и ГСМ',
      quantity: qty > 0 ? qty : 1,
      unit,
      purchasePrice,
      salePrice,
      location: 'Основной склад',
    });
  }
}

console.log('Total warehouse parts parsed:', warehouseParts.length);

// 5. Employees
const employees = [
  { id: 'emp-1', name: 'Водоватовский Антон Игоревич', role: 'director', roleTitle: 'Директор, Главный бухгалтер', phone: '+7 (900) 400-09-07', paymentScheme: 'combined', laborPercent: 0, normHourRate: 0, baseSalary: 100000, partsPercent: 0, isActive: true },
  { id: 'emp-2', name: 'Абдулин Рустам', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-3', name: 'Абдуллин Раиф Мавлетович', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '+7 (922) 062-89-81', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-4', name: 'Абдуллин Рамиз Раифович', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-5', name: 'Арсенюк Максим', role: 'manager', roleTitle: 'Мастер-приемщик', phone: '+7 (919) 554-14-40', paymentScheme: 'combined', laborPercent: 10, normHourRate: 0, baseSalary: 50000, partsPercent: 5, isActive: true },
  { id: 'emp-6', name: 'Зарипов Руслан Ф.', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-7', name: 'Казыев Сергей Наилович', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '+7 (912) 910-99-01', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-8', name: 'Кофеев Эдуард', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-9', name: 'Кудин Денис Владимирович', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '+7 (961) 983-29-39', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-10', name: 'Механошин Дмитрий Викторович', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-11', name: 'Порошин Александр Васильевич', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '+7 (964) 203-32-96', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-12', name: 'Скрипник Сергей Леонидович', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-13', name: 'Тимаков Денис Дмитриевич', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-14', name: 'Урман Дмитрий Андреевич', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-15', name: 'Черный Александр', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
  { id: 'emp-16', name: 'Эльмурзаев Азамат Ярашевич', role: 'mechanic', roleTitle: 'Мастер-исполнитель', phone: '', paymentScheme: 'percent_labor', laborPercent: 40, normHourRate: 900, baseSalary: 0, partsPercent: 3, isActive: true },
];

// 6. Write JSON files
const clientsArray = Array.from(clientsMap.values());
fs.writeFileSync(path.join(backupDir, 'autodealer_clients_backup_2026-11-17.json'), JSON.stringify(clientsArray, null, 2), 'utf8');
fs.writeFileSync(path.join(backupDir, 'autodealer_repair_orders_2026-11-17.json'), JSON.stringify(orders, null, 2), 'utf8');
fs.writeFileSync(path.join(backupDir, 'autodealer_warehouse_stock_2026-11-17.json'), JSON.stringify(warehouseParts, null, 2), 'utf8');
fs.writeFileSync(path.join(backupDir, 'autodealer_employees_2026-11-17.json'), JSON.stringify(employees, null, 2), 'utf8');

console.log('SUCCESS: All files converted and saved into public/backups/');
