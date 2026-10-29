"use client";

export type OrderStatus =
  | "estimate"        // Заявка / Оценка
  | "in_progress"     // В работе
  | "parts_waiting"   // Ожидание запчастей
  | "ready"           // Готов к выдаче
  | "closed";         // Закрыт / Оплачен

export interface OrderWorkItem {
  id: string;
  name: string;            // Название работы
  mechanic: string;        // Исполнитель (механик)
  laborHours: number;      // Количество нормо-часов (Н/Ч)
  ratePerHour: number;     // Стоимость 1 Н/Ч (например 2500 ₽)
  discountPercent: number; // Скидка % (например 0%, 5%, 10%)
  total: number;           // Итого по работе
}

export interface OrderPartItem {
  id: string;
  oem: string;             // Артикул (OEM)
  name: string;            // Наименование детали
  qty: number;             // Количество
  unit: string;            // шт, л, компл, кг
  purchasePrice: number;   // Цена закупки
  salePrice: number;       // Цена продажи клиенту
  total: number;           // qty * salePrice
}

export interface OrderClient {
  id?: string;
  type: "individual" | "legal"; // Физлицо / Юрлицо
  name: string;                 // ФИО или Название (например: ИП Смирнов А.В., ООО "ТрансЛогистик")
  phone: string;
  inn?: string;
  email?: string;
  address?: string;
}

export interface OrderVehicle {
  make: string;            // Марка (ГАЗ, КАМАЗ, Scania, Toyota...)
  model: string;           // Модель (Газель Next, 65115, Hilux...)
  licensePlate: string;    // Госномер (В456ОР89)
  vin: string;             // VIN номер (17 символов)
  year: number;            // Год выпуска
  mileage: number;         // Пробег (км)
  color?: string;
  complaints: string;      // Причина обращения / жалобы клиента
}

export interface RepairOrder {
  id: string;              // Внутренний ID (e.g. ord-1729350000)
  orderNumber: string;     // Номер заказ-наряда (e.g. "ЗН-2026-0042")
  status: OrderStatus;
  createdAt: string;       // Дата создания (YYYY-MM-DD или ISO)
  closedAt?: string;       // Дата закрытия
  scheduledDate?: string;  // Планируемая дата
  scheduledTime?: string;  // Планируемое время
  bayId?: string;          // Назначенный пост
  client: OrderClient;
  vehicle: OrderVehicle;
  works: OrderWorkItem[];
  parts: OrderPartItem[];
  inspection?: VehicleInspectionData;
  recommendations?: string; // Рекомендации мастера
  totalWorks: number;      // Сумма по работам
  totalParts: number;      // Сумма по запчастям
  grandTotal: number;      // ИТОГО К ОПЛАТЕ = totalWorks + totalParts
  paidAmount?: number;     // Фактически оплачено
  warrantyDaysWorks?: number; // Срок гарантии на работы (по умолчанию 30 дней)
  warrantyDaysParts?: number; // Срок гарантии на запчасти (по умолчанию 14 дней)
  masterName?: string;     // Мастер-приемщик
  username: string;        // admin vs antonv
}

export interface WarehousePart {
  id: string;
  oem: string;             // Артикул OEM
  name: string;            // Наименование
  category: string;        // Категория (Фильтры, Тормоза, Масла, Двигатель, Ходовая)
  quantity: number;        // Текущий остаток
  minQuantity: number;     // Мин. неснижаемый остаток
  unit: string;            // шт, л, компл
  purchasePrice: number;   // Цена закупки
  salePrice: number;       // Цена продажи
  location?: string;       // Стеллаж / Ячейка
  username: string;
}

export interface ServiceBay {
  id: string;
  name: string;            // Пост 1: Двухстоечный подъемник, Пост 2: Грузовая яма...
  type: "lift" | "pit" | "electric" | "general";
  color: string;
}

export interface BayAppointment {
  id: string;
  bayId: string;
  orderId?: string;
  orderNumber?: string;
  clientName: string;
  vehicle: string;
  licensePlate: string;
  date: string;            // YYYY-MM-DD
  startTime: string;       // "09:00"
  endTime: string;         // "11:30"
  description: string;
  status: "scheduled" | "in_progress" | "completed";
  username: string;
}

export interface ClientVehicleRecord {
  id: string;
  name: string;
  type: "individual" | "legal";
  phone: string;
  inn?: string;
  vehicles: Array<{
    make: string;
    model: string;
    licensePlate: string;
    vin: string;
    year: number;
    mileage: number;
  }>;
  totalOrdersCount: number;
  totalSpent: number;
  username: string;
}

export type ServiceDocumentType =
  | "work_order"       // Заказ-наряд (Договор-заказ)
  | "acceptance_act"   // Акт приема-передачи ТС (Акт осмотра)
  | "completion_act"   // Акт выполненных работ
  | "payment_receipt"  // Квитанция к заказ-наряду / Чек об оплате
  | "invoice"          // Счет на оплату
  | "defect_sheet";    // Дефектовочная ведомость

export type DamageType = "scratch" | "dent" | "chip" | "rust";

export interface DamagePoint {
  id: string;
  type: DamageType;
  label: "Ц" | "В" | "С" | "К";
  x: number; // percentage 0-100 on schematic
  y: number; // percentage 0-100 on schematic
  view: "top" | "side_left" | "side_right" | "front" | "rear";
  note?: string;
}

export interface VehicleInspectionData {
  vehicleBodyType: "car" | "van_truck";
  fuelLevel: "0" | "1/4" | "1/2" | "3/4" | "1/1";
  equipment: {
    sts: boolean;
    keysCount: number;
    spareWheel: boolean;
    jack: boolean;
    firstAidKit: boolean;
    warningTriangle: boolean;
    dashcam: boolean;
  };
  isDirty: boolean; // ТС принято в грязном виде (скрытые дефекты не выявлены)
  damages: DamagePoint[];
}

export type EmployeeRole =
  | "mechanic"              // Автослесарь
  | "engine_specialist"      // Моторист-агрегатчик
  | "electrician"          // Автоэлектрик-диагност
  | "master_receiver"      // Мастер-приемщик
  | "suspension_specialist" // Слесарь по ходовой части
  | "diagnostician";       // Диагност

export type PaymentScheme =
  | "percent_labor"    // % от стоимости выполненных работ (например 40%)
  | "fixed_norm_hour"  // Фиксированная ставка за 1 нормо-час (например 900 ₽)
  | "combined";        // Оклад + % от работ + % от запчастей

export interface ServiceEmployee {
  id: string;
  name: string;             // ФИО (например: Иванов М.С.)
  role: EmployeeRole;       // Должность
  roleTitle?: string;       // Читаемое название должности
  phone?: string;
  paymentScheme: PaymentScheme;
  laborPercent: number;     // % от работ (например 40)
  normHourRate: number;     // ₽ за 1 Н/Ч (например 900)
  baseSalary: number;       // Оклад (например 45000)
  partsPercent: number;     // % от запчастей (например 3)
  isActive: boolean;
}

export interface MasterPayrollWorkDetail {
  orderId: string;
  orderNumber: string;
  date: string;
  vehicle: string;
  licensePlate: string;
  clientName: string;
  workName: string;
  laborHours: number;
  ratePerHour: number;
  clientWorkTotal: number;
  earnedRub: number;
}

export interface MasterPayrollSummary {
  employeeId: string;
  employeeName: string;
  role: string;
  roleTitle: string;
  paymentScheme: PaymentScheme;
  paymentSchemeLabel: string;
  ordersCount: number;
  totalLaborHours: number;
  totalLaborRevenue: number;   // Выручка СТО по работам
  totalPartsRevenue: number;   // Выручка по запчастям
  accruedLaborRub: number;     // Начислено по выработке
  baseSalary: number;          // Оклад
  bonusRub: number;            // Премия / Бонус
  deductionRub: number;        // Удержания / Аванс / Штраф
  netPayoutRub: number;        // ИТОГО К ВЫПЛАТЕ
  status: "pending" | "paid";  // Статус выплаты
  details: MasterPayrollWorkDetail[];
}

export interface StoCompanyRequisites {
  name: string;             // Полное наименование (например: ИП Водоватовский Антон Игоревич)
  brandName: string;        // Сокращенное наименование (например: ИП Водоватовский А.И. (СТО «Чайка-Сервис»))
  address: string;          // Юридический и фактический адрес
  phone: string;
  email: string;
  inn: string;              // ИНН
  kpp?: string;             // КПП (для ИП не применимо / опционально)
  ogrn: string;             // ОГРНИП / ОГРН
  okpo?: string;            // ОКПО
  oktmo?: string;           // ОКТМО
  okved?: string;           // ОКВЭД
  taxSystem?: string;       // Система налогообложения (УСН Доходы, Патент, Без НДС)
  bankName: string;         // Наименование банка (Филиал «Екатеринбургский» АО «АЛЬФА-БАНК»)
  bik: string;              // БИК
  rs: string;               // Расчетный счет
  ks: string;               // Корреспондентский счет
  defaultRatePerHour: number;
  masterReceiver: string;
  director: string;
  directorBasis?: string;   // Действует на основании (Свидетельства)
  mechanics: string[];
  employees?: ServiceEmployee[]; // Полный справочник сотрудников со ставками ЗП
  stampUrl?: string;             // Прозрачный PNG оттиска печати
  signatureUrl?: string;         // Прозрачный PNG образца подписи
  facsimileDefaultEnabled?: boolean; // Включать факсимиле по умолчанию
  scanModeDefaultEnabled?: boolean;  // Включать эффект скана
}

export interface WarehouseInvoiceItem {
  id: string;
  oem: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  location?: string;
}

export interface WarehouseInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  date: string;
  items: WarehouseInvoiceItem[];
  totalAmount: number;
  createdAt: string;
  username: string;
}
