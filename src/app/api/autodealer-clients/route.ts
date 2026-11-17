import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";
import { ClientVehicleRecord, RepairOrder, WarehousePart, ServiceEmployee } from "@/lib/auto-service-types";

const BACKUP_DIR = path.join(process.cwd(), "public", "backups");
const CLIENTS_JSON = path.join(BACKUP_DIR, "autodealer_clients_backup_2026-11-17.json");
const ORDERS_JSON = path.join(BACKUP_DIR, "autodealer_repair_orders_2026-11-17.json");
const WAREHOUSE_JSON = path.join(BACKUP_DIR, "autodealer_warehouse_stock_2026-11-17.json");
const EMPLOYEES_JSON = path.join(BACKUP_DIR, "autodealer_employees_2026-11-17.json");

export async function GET() {
  try {
    let clients: ClientVehicleRecord[] = [];
    let orders: RepairOrder[] = [];
    let warehouse: WarehousePart[] = [];
    let employees: ServiceEmployee[] = [];

    if (fs.existsSync(CLIENTS_JSON)) {
      clients = JSON.parse(fs.readFileSync(CLIENTS_JSON, "utf8"));
    }
    if (fs.existsSync(ORDERS_JSON)) {
      orders = JSON.parse(fs.readFileSync(ORDERS_JSON, "utf8"));
    }
    if (fs.existsSync(WAREHOUSE_JSON)) {
      warehouse = JSON.parse(fs.readFileSync(WAREHOUSE_JSON, "utf8"));
    }
    if (fs.existsSync(EMPLOYEES_JSON)) {
      employees = JSON.parse(fs.readFileSync(EMPLOYEES_JSON, "utf8"));
    }

    const totalVehicles = clients.reduce((sum, c) => sum + (c.vehicles?.length || 0), 0);

    const backupFiles = [
      { name: "База клиентов и автомобилей (.xlsx)", filename: "autodealer_clients_backup_2026-11-17.xlsx", url: "/backups/autodealer_clients_backup_2026-11-17.xlsx", size: "291 КБ" },
      { name: "Реестр заказ-нарядов (.xlsx)", filename: "autodealer_repair_orders_2026-11-17.xlsx", url: "/backups/autodealer_repair_orders_2026-11-17.xlsx", size: "65 КБ" },
      { name: "Остатки на складе (.xlsx)", filename: "autodealer_warehouse_stock_2026-11-17.xlsx", url: "/backups/autodealer_warehouse_stock_2026-11-17.xlsx", size: "51 КБ" },
      { name: "Справочник номенклатуры (.xlsx)", filename: "autodealer_nomenclature_2026-11-17.xlsx", url: "/backups/autodealer_nomenclature_2026-11-17.xlsx", size: "332 КБ" },
      { name: "Прайс-лист работ и услуг (.xlsx)", filename: "autodealer_works_catalog_2026-11-17.xlsx", url: "/backups/autodealer_works_catalog_2026-11-17.xlsx", size: "73 КБ" },
    ];

    return NextResponse.json({
      success: true,
      count: clients.length,
      vehiclesCount: totalVehicles,
      ordersCount: orders.length,
      warehouseCount: warehouse.length,
      employeesCount: employees.length,
      clients,
      orders,
      warehouse,
      employees,
      backupFiles,
      backupUrl: "/backups/autodealer_clients_backup_2026-11-17.xlsx",
      backupFilename: "autodealer_clients_backup_2026-11-17.xlsx",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка чтения базы АвтоДилер" },
      { status: 500 }
    );
  }
}
