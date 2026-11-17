import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";
import { ClientVehicleRecord } from "@/lib/auto-service-types";

const BACKUP_DIR = path.join(process.cwd(), "public", "backups");
const BACKUP_FILE = path.join(BACKUP_DIR, "autodealer_clients_backup_2026-11-17.xlsx");
const JSON_BACKUP_FILE = path.join(BACKUP_DIR, "autodealer_clients_backup_2026-11-17.json");

function normalizePhone(raw: any): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11) {
    const d = digits.startsWith("8") ? "7" + digits.slice(1) : digits;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  return String(raw).trim();
}

export function parseAutoDealerWorkbook(bufferOrPath: Buffer | string): ClientVehicleRecord[] {
  let workbook: xlsx.WorkBook;
  if (typeof bufferOrPath === "string") {
    workbook = xlsx.readFile(bufferOrPath);
  } else {
    workbook = xlsx.read(bufferOrPath, { type: "buffer" });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  return rows
    .map((r, idx) => {
      const isLegal = r["Тип клиента"] === "ЮЛ" || Boolean(r["ИНН"] && String(r["ИНН"]).length === 10);
      const name = (r["Наименование для документов"] || r["Наименование в программе"] || "").trim();

      // Find phone across contact persons
      let phone = "";
      for (let c = 1; c <= 6; c++) {
        for (let k = 1; k <= 3; k++) {
          const val = r[`Контактная персона[${c}].Контакты[${k}].Значение`];
          if (val && !phone) {
            phone = normalizePhone(val);
          }
        }
      }

      // Find vehicles
      const vehicles: Array<{
        make: string;
        model: string;
        licensePlate: string;
        vin: string;
        year: number;
        mileage: number;
      }> = [];

      for (let v = 1; v <= 30; v++) {
        const make = (r[`Автомобиль[${v}].Марка`] || "").trim();
        const model = (r[`Автомобиль[${v}].Модель`] || "").trim();
        const plate = (r[`Автомобиль[${v}].Госномер`] || "").trim();
        const vin = (r[`Автомобиль[${v}].VIN`] || "").trim();
        const year = parseInt(r[`Автомобиль[${v}].Год выпуска`], 10) || 0;
        if (make || model || plate || vin) {
          vehicles.push({
            make: make || "Автомобиль",
            model: model || "",
            licensePlate: plate.replace(/\s+/g, "").toUpperCase(),
            vin: vin.replace(/\s+/g, "").toUpperCase(),
            year: year || 2018,
            mileage: 0,
          });
        }
      }

      return {
        id: "ad-" + (r["Идентификатор"] || idx + 1),
        name: name || `Клиент #${idx + 1}`,
        type: (isLegal ? "legal" : "individual") as "individual" | "legal",
        phone: phone || "",
        inn: r["ИНН"] ? String(r["ИНН"]).trim() : undefined,
        vehicles,
        totalOrdersCount: 0,
        totalSpent: 0,
        username: "antonv",
      };
    })
    .filter((c) => c.name.length > 0);
}

export async function GET() {
  try {
    if (fs.existsSync(JSON_BACKUP_FILE)) {
      const raw = fs.readFileSync(JSON_BACKUP_FILE, "utf8");
      const clients: ClientVehicleRecord[] = JSON.parse(raw);
      const totalVehicles = clients.reduce((sum, c) => sum + c.vehicles.length, 0);
      return NextResponse.json({
        success: true,
        count: clients.length,
        vehiclesCount: totalVehicles,
        backupUrl: "/backups/autodealer_clients_backup_2026-11-17.xlsx",
        backupFilename: "autodealer_clients_backup_2026-11-17.xlsx",
        clients,
      });
    }

    if (fs.existsSync(BACKUP_FILE)) {
      const clients = parseAutoDealerWorkbook(BACKUP_FILE);
      const totalVehicles = clients.reduce((sum, c) => sum + c.vehicles.length, 0);
      return NextResponse.json({
        success: true,
        count: clients.length,
        vehiclesCount: totalVehicles,
        backupUrl: "/backups/autodealer_clients_backup_2026-11-17.xlsx",
        backupFilename: "autodealer_clients_backup_2026-11-17.xlsx",
        clients,
      });
    }

    return NextResponse.json({
      success: false,
      error: "Резервная копия базы АвтоДилера не найдена",
      clients: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка чтения базы АвтоДилер" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "Файл не передан" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const saveName = `autodealer_clients_backup_${timestamp}.xlsx`;
    const fullSavePath = path.join(BACKUP_DIR, saveName);
    fs.writeFileSync(fullSavePath, buffer);

    const clients = parseAutoDealerWorkbook(buffer);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `autodealer_clients_backup_${timestamp}.json`),
      JSON.stringify(clients, null, 2),
      "utf8"
    );

    const totalVehicles = clients.reduce((sum, c) => sum + c.vehicles.length, 0);

    return NextResponse.json({
      success: true,
      count: clients.length,
      vehiclesCount: totalVehicles,
      backupUrl: `/backups/${saveName}`,
      backupFilename: saveName,
      clients,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка импорта файла АвтоДилер" },
      { status: 500 }
    );
  }
}
