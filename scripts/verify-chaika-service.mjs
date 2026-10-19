import assert from "node:assert";
import {
  calculateOrderTotals,
  formatCurrency,
  getStatusMeta,
  getInitialOrders,
  getInitialWarehouse,
  AUTO_DEALER_LABOR_STANDARDS,
  SERVICE_COMPANY_REQUISITES,
} from "../src/lib/auto-service-data.ts";
import { createAutoServiceDocx } from "../src/lib/auto-service-docx.ts";
import { Packer } from "docx";

console.log("=== RUNNING CHAIKA-SERVICE / AUTO-DEALER CRM VERIFICATION ===");

// 1. Verify Company Requisites
console.log("\n1. Verifying company requisites...");
assert.strictEqual(SERVICE_COMPANY_REQUISITES.brandName, "ЧАЙКА-СЕРВИС CRM");
assert.ok(SERVICE_COMPANY_REQUISITES.inn.length >= 10);
assert.ok(SERVICE_COMPANY_REQUISITES.phone.includes("+7"));
console.log("✓ Company requisites valid:", SERVICE_COMPANY_REQUISITES.name);

// 2. Verify Labor Standards & Catalogs
console.log("\n2. Verifying labor standards catalog...");
assert.ok(AUTO_DEALER_LABOR_STANDARDS.length >= 3);
const gazStandards = AUTO_DEALER_LABOR_STANDARDS.find((v) => v.vehicle.includes("Газель"));
assert.ok(gazStandards);
const oilChange = gazStandards.operations.find((op) => op.name.includes("масла"));
assert.ok(oilChange);
assert.strictEqual(oilChange.hours, 0.8);
console.log(`✓ Labor standard found: [${gazStandards.vehicle}] "${oilChange.name}" - ${oilChange.hours} н-ч`);

// 3. Verify Order Calculations & Discounts
console.log("\n3. Verifying order calculations...");
const testWorks = [
  { id: "w-1", name: "Замена масла в ДВС", mechanic: "Иванов", laborHours: 0.8, ratePerHour: 2000, discountPercent: 0, total: 1600 },
  { id: "w-2", name: "Замена тормозных колодок", mechanic: "Иванов", laborHours: 1.2, ratePerHour: 2000, discountPercent: 10, total: 2160 },
];
const testParts = [
  { id: "p-1", oem: "OIL-1", name: "Масло моторное 6л", qty: 1, unit: "шт", purchasePrice: 3000, salePrice: 4200, discountPercent: 0, total: 4200 },
  { id: "p-2", oem: "BRK-1", name: "Колодки передние", qty: 1, unit: "компл", purchasePrice: 2000, salePrice: 2800, discountPercent: 0, total: 2800 },
];
const totals = calculateOrderTotals(testWorks, testParts);
assert.strictEqual(totals.totalWorks, 3760);
assert.strictEqual(totals.totalParts, 7000);
assert.strictEqual(totals.grandTotal, 10760);
console.log(`✓ Calculation verified: Works ${totals.totalWorks} ₽ + Parts ${totals.totalParts} ₽ = Grand Total ${totals.grandTotal} ₽`);
console.log(`✓ Formatted currency: ${formatCurrency(totals.grandTotal)}`);

// 4. Verify Seed Data & User Isolation
console.log("\n4. Verifying seed data & user isolation...");
const adminOrders = getInitialOrders("admin");
const antonvOrders = getInitialOrders("antonv");
assert.ok(adminOrders.length > 0, "admin must have seed orders");
assert.ok(antonvOrders.length > 0, "antonv must have seed orders");
assert.notStrictEqual(adminOrders[0].orderNumber, antonvOrders[0].orderNumber, "Data must be isolated between users");
console.log(`✓ User isolation verified: admin has ${adminOrders.length} orders (${adminOrders[0].orderNumber}), antonv has ${antonvOrders.length} orders (${antonvOrders[0].orderNumber})`);

// 5. Verify Warehouse & Deficit Alert Logic
console.log("\n5. Verifying warehouse parts and deficit calculation...");
const parts = getInitialWarehouse("admin");
assert.ok(parts.length >= 6);
const deficitParts = parts.filter((p) => p.quantity <= p.minQuantity);
assert.ok(deficitParts.length > 0, "Must contain deficit items for safety stock alerts");
console.log(`✓ Warehouse verified: total ${parts.length} SKU items, ${deficitParts.length} in deficit state:`);
deficitParts.forEach((dp) => {
  console.log(`   ⚠️ Deficit: [${dp.oem || dp.id}] ${dp.name} (остаток: ${dp.quantity} ${dp.unit}, мин: ${dp.minQuantity})`);
});

// 6. Verify Status Metadata
console.log("\n6. Verifying status metadata mapping...");
const inProgressMeta = getStatusMeta("in_progress");
assert.strictEqual(inProgressMeta.label, "В работе");
assert.ok(inProgressMeta.bg.length > 0);
console.log(`✓ Status meta verified for in_progress: "${inProgressMeta.label}"`);

// 7. Verify DOCX Generation for all 5 РФ СТО documents
console.log("\n7. Verifying DOCX generation for all 5 document types...");
const sampleOrder = adminOrders[0];
const docTypes = ["work_order", "acceptance_act", "completion_act", "invoice", "defect_sheet"];

for (const docType of docTypes) {
  const doc = await createAutoServiceDocx(sampleOrder, docType);
  const buffer = await Packer.toBuffer(doc);
  assert.ok(buffer, `Buffer should be generated for ${docType}`);
  assert.ok(buffer.length > 1000, `Buffer size for ${docType} should be realistic (>1KB), got ${buffer.length} bytes`);
  console.log(`✓ DOCX generated successfully for "${docType}": ${buffer.length} bytes`);
}

console.log("\n🎉 ALL CHAIKA-SERVICE CRM VERIFICATION CHECKS PASSED SUCCESSFULLY!");
