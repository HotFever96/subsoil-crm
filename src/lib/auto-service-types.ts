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
  | "acceptance_act"   // Акт приема-передачи ТС
  | "completion_act"   // Акт выполненных работ
  | "invoice"          // Счет на оплату
  | "defect_sheet";    // Дефектовочная ведомость
