import { CustomerInvoice, RepairOrder } from "./auto-service-types";

export function getInitialCustomerInvoices(username: string): CustomerInvoice[] {
  const normUser = (username || "").trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  return [
    {
      id: "inv-2026-00192",
      invoiceNumber: "СЧ-2026-00192",
      orderId: "ord-1",
      orderNumber: "ЗН-2026-0042",
      status: "paid",
      date: tenDaysAgo,
      dueDate: fiveDaysAgo,
      client: {
        type: "legal",
        name: "ООО «СеверТрансЛогистик»",
        phone: "+7 (922) 000-11-22",
        inn: "8905048921",
        email: "severtrans89@mail.ru",
        address: "629800, ЯНАО, г. Ноябрьск, Промзона, панель 4",
      },
      items: [
        {
          id: "it-1",
          name: "Компьютерная диагностика ЭБУ и форсунок Common Rail",
          qty: 1,
          unit: "услуга",
          price: 3500,
          total: 3500,
          type: "work",
        },
        {
          id: "it-2",
          name: "Замена комплекта шкворней передней оси ГАЗон Next",
          qty: 2,
          unit: "компл",
          price: 9000,
          total: 18000,
          type: "work",
        },
        {
          id: "it-3",
          name: "Ремкомплект шкворней ГАЗон Next (Оригинал ГАЗ)",
          qty: 1,
          unit: "компл",
          price: 14500,
          total: 14500,
          type: "part",
        },
        {
          id: "it-4",
          name: "Масло моторное Лукойл Авангард Профессионал 10W-40 (бочковое)",
          qty: 15,
          unit: "л",
          price: 850,
          total: 12750,
          type: "part",
        },
      ],
      subtotal: 48750,
      discountTotal: 250,
      totalAmount: 48500,
      paidAmount: 48500,
      paidAt: fiveDaysAgo,
      paymentMethod: "Безналичный расчет на р/с",
      note: "Оплата по акту выполненных работ к ЗН-2026-0042. Без НДС.",
      createdAt: tenDaysAgo,
      username: normUser || "admin",
    },
    {
      id: "inv-2026-00193",
      invoiceNumber: "СЧ-2026-00193",
      status: "unpaid",
      date: today,
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      client: {
        type: "legal",
        name: "ИП Смирнов Алексей Валерьевич",
        phone: "+7 (922) 444-88-99",
        inn: "890501234567",
        email: "smirnov.transport@yandex.ru",
        address: "г. Ноябрьск, ул. Транспортная, д. 12",
      },
      items: [
        {
          id: "it-1",
          name: "Предоплата за запчасти: Ступичный узел в сборе FAG для тягача Scania R420",
          qty: 1,
          unit: "шт",
          price: 36000,
          total: 36000,
          type: "advance",
        },
      ],
      subtotal: 36000,
      discountTotal: 0,
      totalAmount: 36000,
      paidAmount: 0,
      note: "Авансовый платеж по заказу запчастей РОССКО. Поставка 2-3 дня.",
      createdAt: today,
      username: normUser || "admin",
    },
    {
      id: "inv-2026-00194",
      invoiceNumber: "СЧ-2026-00194",
      orderId: "ord-2",
      orderNumber: "ЗН-2026-0039",
      status: "partially_paid",
      date: fiveDaysAgo,
      dueDate: today,
      client: {
        type: "individual",
        name: "Козлов Дмитрий Сергеевич",
        phone: "+7 (912) 345-67-89",
        inn: "",
        email: "dmitry.kozlov@gmail.com",
        address: "г. Ноябрьск, ул. Ленина, д. 45, кв. 12",
      },
      items: [
        {
          id: "it-1",
          name: "Комплексное ТО-2 Газель Бизнес (УМЗ-4216)",
          qty: 1,
          unit: "усл",
          price: 7500,
          total: 7500,
          type: "work",
        },
        {
          id: "it-2",
          name: "Фильтр масляный, воздушный и топливный (комплект)",
          qty: 1,
          unit: "компл",
          price: 3200,
          total: 3200,
          type: "part",
        },
        {
          id: "it-3",
          name: "Замена передних тормозных колодок и прокачка тормозной системы",
          qty: 1,
          unit: "усл",
          price: 4500,
          total: 4500,
          type: "work",
        },
      ],
      subtotal: 15200,
      discountTotal: 0,
      totalAmount: 15200,
      paidAmount: 10000,
      paidAt: fiveDaysAgo,
      paymentMethod: "QR-код СБП",
      note: "Внесен аванс 10 000 ₽ при приеме автомобиля. Остаток 5 200 ₽ при выдаче.",
      createdAt: fiveDaysAgo,
      username: normUser || "admin",
    },
  ];
}

export function loadCustomerInvoices(username: string): CustomerInvoice[] {
  if (typeof window === "undefined") return getInitialCustomerInvoices(username);
  const key = `geo_ai_customer_invoices_${username || "guest"}_v1`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  const initial = getInitialCustomerInvoices(username);
  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveCustomerInvoices(invoices: CustomerInvoice[], username: string): void {
  if (typeof window === "undefined") return;
  const key = `geo_ai_customer_invoices_${username || "guest"}_v1`;
  try {
    localStorage.setItem(key, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent("geo_ai_customer_invoices_updated"));
  } catch (err) {
    console.error("Failed to save customer invoices:", err);
  }
}

export function createInvoiceFromRepairOrder(order: RepairOrder, username: string): CustomerInvoice {
  const items: CustomerInvoice["items"] = [];

  (order.works || []).forEach((w) => {
    items.push({
      id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `Работа: ${w.name}${w.laborHours ? ` (${w.laborHours} Н/Ч)` : ""}`,
      qty: 1,
      unit: "усл",
      price: w.total || (w.laborHours * w.ratePerHour) || 0,
      total: w.total || (w.laborHours * w.ratePerHour) || 0,
      type: "work",
    });
  });

  (order.parts || []).forEach((p) => {
    items.push({
      id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `Деталь: ${p.name} [${p.oem || "OEM"}]`,
      qty: p.qty || 1,
      unit: p.unit || "шт",
      price: p.salePrice || 0,
      total: p.total || ((p.qty || 1) * (p.salePrice || 0)),
      type: "part",
    });
  });

  const subtotal = items.reduce((acc, i) => acc + i.total, 0);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dueDateStr = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const invNum = `СЧ-${now.getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

  return {
    id: `inv-${Date.now()}`,
    invoiceNumber: invNum,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.paidAmount && order.paidAmount >= order.grandTotal ? "paid" : "unpaid",
    date: dateStr,
    dueDate: dueDateStr,
    client: {
      type: order.client?.inn ? "legal" : "individual",
      name: order.client?.name || "Контрагент",
      phone: order.client?.phone || "",
      inn: order.client?.inn || "",
      email: order.client?.email || "",
      address: order.client?.address || "",
    },
    items,
    subtotal,
    discountTotal: 0,
    totalAmount: subtotal,
    paidAmount: order.paidAmount || 0,
    paidAt: order.paidAmount && order.paidAmount >= order.grandTotal ? dateStr : undefined,
    note: `Счет на оплату на основании Заказ-наряда № ${order.orderNumber} (${order.vehicle?.make} ${order.vehicle?.model}, ${order.vehicle?.licensePlate}). Без НДС.`,
    createdAt: dateStr,
    username: username || "admin",
  };
}
