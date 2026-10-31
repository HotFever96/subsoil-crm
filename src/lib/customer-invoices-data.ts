import { CustomerInvoice, RepairOrder } from "./auto-service-types";

export function getInitialCustomerInvoices(username: string): CustomerInvoice[] {
  // Zero mock data: initial invoices list is strictly empty
  return [];
}

export function loadCustomerInvoices(username: string): CustomerInvoice[] {
  if (typeof window === "undefined") return [];
  const key = `geo_ai_customer_invoices_${username || "guest"}_v1`;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge legacy mock invoices if previously cached
        const clean = parsed.filter(
          (inv) =>
            inv.id !== "inv-2026-00192" &&
            inv.id !== "inv-2026-00193" &&
            inv.id !== "inv-2026-00194"
        );
        if (clean.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(clean));
        }
        return clean;
      }
    }
  } catch {}
  return [];
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
