"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Printer,
  FileDown,
  X,
  FileText,
  CheckCircle2,
  FolderArchive,
  Car,
  Wrench,
  AlertCircle,
  Receipt,
  FileCheck,
  Stamp,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { RepairOrder, ServiceDocumentType } from "@/lib/auto-service-types";
import { formatCurrency, getStoRequisites, numberToWordsRu } from "@/lib/auto-service-data";
import { exportAutoServiceDocx } from "@/lib/auto-service-docx";
import { VehicleInspectionSchematic } from "./VehicleInspectionSchematic";

interface ServiceDocumentModalProps {
  order: RepairOrder;
  initialType?: ServiceDocumentType;
  isOpen: boolean;
  onClose: () => void;
  onSaveToArchive?: (docName: string, docType: ServiceDocumentType) => void;
}

export function formatAcceptedDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "09.11.2026 09:35";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = timeStr || `${String(d.getHours() || 9).padStart(2, "0")}:${String(d.getMinutes() || 35).padStart(2, "0")}`;
    return `${day}.${month}.${year} ${time}`;
  } catch {
    return dateStr;
  }
}

export function formatDocRub(amount: number): string {
  return Number(amount || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface ServiceDocumentPrintSheetProps {
  order: RepairOrder;
  docType?: ServiceDocumentType;
  isFacsimile?: boolean;
  isScanMode?: boolean;
  sbpQrUrl?: string;
  className?: string;
}

export const ServiceDocumentPrintSheet: React.FC<ServiceDocumentPrintSheetProps> = ({
  order,
  docType = "work_order",
  isFacsimile = true,
  isScanMode = false,
  sbpQrUrl,
  className = "",
}) => {
  const req = getStoRequisites(order.username);
  const stampImg = "/facsimile/chaika_stamp.png";
  const sigImg = "/facsimile/anton_signature.png";

  const isPaid = order.paymentStatus === "paid";
  const paidAmount = isPaid ? order.grandTotal : Number(order.paidAmount || 0);
  const debtAmount = Math.max(0, order.grandTotal - paidAmount);
  const totalPartsQuantity = order.parts.reduce((sum, p) => sum + (Number(p.qty) || 1), 0);

  return (
    <div
      id="printable-service-doc"
      className={`max-w-[760px] mx-auto text-black p-6 sm:p-10 shadow-lg print:shadow-none print:p-0 rounded-lg print:rounded-none font-sans text-[11px] leading-tight transition-all select-text ${
        isScanMode
          ? "bg-[#faf8f2] border border-stone-300 filter contrast-[1.04] brightness-[0.98] sepia-[0.04]"
          : "bg-white border border-zinc-300 print:border-none"
      } ${className}`}
    >
      {/* Header: Exact replica of Photo 1 */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-black">
        {/* Left: Chaika Brand Logo */}
        <div className="flex flex-col items-start w-1/4 shrink-0">
          <img
            src="/logo-chaika-white.png"
            alt="Чайка СТО"
            className="h-10 w-auto object-contain filter invert shrink-0"
          />
          <span className="text-[8.5px] uppercase tracking-wider text-black font-semibold mt-0.5">
            Станция технического обслуживания
          </span>
        </div>

        {/* Center: Requisites */}
        <div className="flex-1 text-center text-[10px] leading-snug px-2">
          <div className="font-bold text-black text-[10.5px]">
            ИП Водоватовский Антон Игоревич, ИНН 263112957774
          </div>
          <div className="text-zinc-800">
            629800, Россия, Ямало-Ненецкий АО, г. Ноябрьск
          </div>
        </div>

        {/* Right: Barcode + Date accepted + SBP UDMPAY QR Code */}
        <div className="flex flex-col items-end w-1/3 text-right shrink-0">
          {/* Barcode from Photo 1 */}
          <div className="flex flex-col items-end mb-1">
            <div className="flex items-center space-x-0.5 h-5">
              <div className="w-[1.5px] h-full bg-black" />
              <div className="w-[1px] h-full bg-black ml-0.5" />
              <div className="w-[2.5px] h-full bg-black ml-1" />
              <div className="w-[1px] h-full bg-black ml-0.5" />
              <div className="w-[3px] h-full bg-black ml-1" />
              <div className="w-[1.5px] h-full bg-black ml-0.5" />
              <div className="w-[1px] h-full bg-black ml-1" />
              <div className="w-[2px] h-full bg-black ml-0.5" />
              <div className="w-[1px] h-full bg-black ml-1" />
              <div className="w-[2.5px] h-full bg-black ml-0.5" />
              <div className="w-[1.5px] h-full bg-black ml-1" />
              <div className="w-[1px] h-full bg-black ml-0.5" />
              <div className="w-[3px] h-full bg-black ml-1" />
            </div>
            <span className="font-mono text-[8px] tracking-wider text-zinc-900 font-semibold">2 110000 009724</span>
          </div>

          <div className="text-[10px] text-zinc-800 font-semibold mb-1">
            Принят: {formatAcceptedDateTime(order.createdAt, order.scheduledTime)}
          </div>
          {sbpQrUrl && (
            <div className="flex items-center space-x-1.5 border border-zinc-300 rounded p-1 bg-white">
              <img src={sbpQrUrl} alt="QR СБП UDMPAY" className="w-13 h-13 object-contain" />
              <div className="text-left text-[8px] leading-tight text-zinc-800">
                <div className="font-black text-rose-600">СБП / UDMPAY</div>
                <div>Оплата онлайн</div>
                <div className="text-zinc-500">Наведите камеру</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Title Header */}
      <div className="my-3">
        <h1 className="text-base font-extrabold uppercase tracking-tight text-black">
          {docType === "work_order" && `Предварительный заказ-наряд № ${order.orderNumber}`}
          {docType === "completion_act" && `Заказ-наряд № ${order.orderNumber}`}
          {docType === "acceptance_act" && `Акт приема-передачи ТС № ${order.orderNumber}`}
          {docType === "payment_receipt" && `Квитанция к заказ-наряду № ${order.orderNumber}`}
          {docType === "invoice" && `Счет на оплату № ${order.orderNumber}`}
          {docType === "defect_sheet" && `Дефектовочная ведомость № ${order.orderNumber}`}
        </h1>
      </div>

      {/* 2-Column Metadata Grid (Identical to Photo 1) */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-1 mb-4 text-[11px] leading-snug">
        {/* Left Column (col-span-8) */}
        <div className="col-span-8 space-y-1">
          <div className="grid grid-cols-12">
            <span className="col-span-3 font-semibold text-zinc-800">Заказчик:</span>
            <span className="col-span-9 font-bold text-black">{order.client.name}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-3 font-semibold text-zinc-800">Адрес, тел.:</span>
            <span className="col-span-9 text-zinc-900">
              {[order.client.address, order.client.phone].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-3 font-semibold text-zinc-800">Модель:</span>
            <span className="col-span-9 font-bold text-black">
              {order.vehicle.make} {order.vehicle.model}
            </span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-3 font-semibold text-zinc-800">VIN-номер:</span>
            <span className="col-span-9 font-mono font-bold text-black">
              {order.vehicle.vin || "—"}
            </span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-3 font-semibold text-zinc-800">Гос.номер:</span>
            <span className="col-span-9 font-mono font-extrabold text-black">
              {order.vehicle.licensePlate}
            </span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-3 font-semibold text-zinc-800">Плательщик:</span>
            <span className="col-span-9 font-bold text-black">
              {order.client.payerName ||
                (order.client.type === "legal" ? order.client.name : order.client.name)}
              {order.client.payerInn ? ` (ИНН ${order.client.payerInn})` : ""}
            </span>
          </div>
        </div>

        {/* Right Column (col-span-4) */}
        <div className="col-span-4 space-y-1 pl-2 border-l border-zinc-200">
          <div className="grid grid-cols-12">
            <span className="col-span-7 font-semibold text-zinc-800">Год выпуска:</span>
            <span className="col-span-5 font-bold text-black">{order.vehicle.year || "—"}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-7 font-semibold text-zinc-800">Цвет:</span>
            <span className="col-span-5 text-zinc-900">{order.vehicle.color || "—"}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-7 font-semibold text-zinc-800">Пробег:</span>
            <span className="col-span-5 font-bold text-black">
              {order.vehicle.mileage ? `${order.vehicle.mileage.toLocaleString()} км` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ACCEPTANCE ACT BODY (Schematic view) */}
      {docType === "acceptance_act" && (
        <div className="mb-4 p-2 border border-black bg-white">
          <VehicleInspectionSchematic inspection={order.inspection} readOnly={true} isPrint={true} />
        </div>
      )}

      {/* DEFECT SHEET BODY */}
      {docType === "defect_sheet" && (
        <div className="space-y-3 mb-4">
          <div className="font-bold text-black text-[11px]">Ведомость выявленных дефектов узлов и агрегатов:</div>
          <table className="w-full text-left border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-zinc-100 text-black">
                <th className="p-1 border border-black w-7 text-center">№</th>
                <th className="p-1 border border-black w-32">Узел / Система</th>
                <th className="p-1 border border-black">Описание неисправности</th>
                <th className="p-1 border border-black w-36">Рекомендуемые работы</th>
                <th className="p-1 border border-black w-20 text-center">Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1 border border-black text-center">1</td>
                <td className="p-1 border border-black font-semibold">Ходовая часть / ДВС</td>
                <td className="p-1 border border-black">{order.vehicle.complaints || "Люфт и износ деталей"}</td>
                <td className="p-1 border border-black">Ремонт / замена в рамках ЗН</td>
                <td className="p-1 border border-black text-center font-bold text-red-600">Критично</td>
              </tr>
              {order.works.map((w, idx) => (
                <tr key={idx + 2}>
                  <td className="p-1 border border-black text-center">{idx + 2}</td>
                  <td className="p-1 border border-black">Агрегатный участок</td>
                  <td className="p-1 border border-black">{w.name}</td>
                  <td className="p-1 border border-black">Выполнено</td>
                  <td className="p-1 border border-black text-center text-zinc-800">Норма</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 1: Выполненные работы (Exact columns from Photo 1) */}
      {(docType === "work_order" || docType === "completion_act" || docType === "invoice") && (
        <div className="mb-3">
          <div className="font-bold text-center text-[11px] mb-1 text-black">Выполненные работы</div>
          <table className="w-full text-left border-collapse border border-black text-[10px] leading-tight">
            <thead>
              <tr className="bg-zinc-100 text-black">
                <th className="p-1 border border-black w-6 text-center">№</th>
                <th className="p-1 border border-black w-16 text-center">Код работы</th>
                <th className="p-1 border border-black">Наименование</th>
                <th className="p-1 border border-black w-9 text-center">Крат</th>
                <th className="p-1 border border-black w-14 text-right">Цена</th>
                <th className="p-1 border border-black w-10 text-center">Врем</th>
                <th className="p-1 border border-black w-16 text-right">Стоим.</th>
                <th className="p-1 border border-black w-18 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {order.works.map((w, idx) => (
                <tr key={w.id || idx}>
                  <td className="p-1 border border-black text-center">{idx + 1}</td>
                  <td className="p-1 border border-black text-center font-mono text-[9px] text-zinc-600">
                    {idx + 101}
                  </td>
                  <td className="p-1 border border-black font-medium">{w.name}</td>
                  <td className="p-1 border border-black text-center">1</td>
                  <td className="p-1 border border-black text-right">
                    {formatDocRub(w.ratePerHour || 2500)}
                  </td>
                  <td className="p-1 border border-black text-center font-bold">
                    {w.laborHours}
                  </td>
                  <td className="p-1 border border-black text-right">
                    {formatDocRub(w.total)}
                  </td>
                  <td className="p-1 border border-black text-right font-bold">
                    {formatDocRub(w.total)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-zinc-50">
                <td colSpan={7} className="p-1 border border-black text-right">
                  Итого:
                </td>
                <td className="p-1 border border-black text-right font-extrabold text-black">
                  {formatDocRub(order.totalWorks)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 2: Запасные части и материалы (Exact columns from Photo 1) */}
      {(docType === "work_order" || docType === "completion_act" || docType === "invoice") && order.parts.length > 0 && (
        <div className="mb-3">
          <div className="font-bold text-center text-[11px] mb-1 text-black">Запасные части и материалы</div>
          <table className="w-full text-left border-collapse border border-black text-[10px] leading-tight">
            <thead>
              <tr className="bg-zinc-100 text-black">
                <th className="p-1 border border-black w-6 text-center">№</th>
                <th className="p-1 border border-black w-24">Номер</th>
                <th className="p-1 border border-black">Наименование</th>
                <th className="p-1 border border-black w-20 text-center">Количество</th>
                <th className="p-1 border border-black w-18 text-right">Цена</th>
                <th className="p-1 border border-black w-20 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {order.parts.map((p, idx) => (
                <tr key={p.id || idx}>
                  <td className="p-1 border border-black text-center">{idx + 1}</td>
                  <td className="p-1 border border-black font-mono text-[9px] text-zinc-700">
                    {p.oem || "—"}
                  </td>
                  <td className="p-1 border border-black font-medium">{p.name}</td>
                  <td className="p-1 border border-black text-center">
                    {p.qty} {p.unit || "шт"}
                  </td>
                  <td className="p-1 border border-black text-right">
                    {formatDocRub(p.salePrice)}
                  </td>
                  <td className="p-1 border border-black text-right font-bold">
                    {formatDocRub(p.total)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-zinc-50">
                <td colSpan={3} className="p-1 border border-black text-right">
                  Итого:
                </td>
                <td className="p-1 border border-black text-center font-bold">
                  {totalPartsQuantity}
                </td>
                <td className="p-1 border border-black text-right" />
                <td className="p-1 border border-black text-right font-extrabold text-black">
                  {formatDocRub(order.totalParts)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Total Document Sum & Debt (Exact replica of Photo 1) */}
      <div className="my-3 space-y-1">
        <div className="flex items-baseline space-x-2">
          <span className="font-bold text-xs text-black">Сумма документа:</span>
          <span className="font-extrabold text-sm text-black">
            {formatDocRub(order.grandTotal)} (Без НДС)
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="font-bold text-xs text-black">Задолженность:</span>
          <span className={`font-extrabold text-sm ${debtAmount > 0 ? "text-black" : "text-emerald-700"}`}>
            {formatDocRub(debtAmount)}
          </span>
          {isPaid && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
              Оплачено через СБП
            </span>
          )}
        </div>
      </div>

      {/* Exact Warranty & Disclaimer Text from Photo 1 */}
      <div className="text-[9.5px] leading-tight text-zinc-900 my-3.5 space-y-1 border-t border-zinc-300 pt-2">
        <p>
          Исполнитель несет гарантийные обязательства при условии соблюдения потребителем правил эксплуатации и рекомендаций исполнителя по использованию результатов работы (услуги).
        </p>
        <p>
          С объемом работ и первоначальной стоимостью согласен. Согласен на выполнение сопутствующих работ, стоимость которых не превышает 10% от первоначальной стоимости по заказ-наряду с учетом стоимости запчастей и материалов.
        </p>
      </div>

      {/* Signature Rows with Authentic Facsimile Overlay */}
      <div className="pt-3 mt-4 flex items-end justify-between text-[11px]">
        {/* Left: Customer */}
        <div className="w-[45%]">
          <div className="flex items-baseline">
            <span className="font-semibold text-black">Заказчик:</span>
            <div className="flex-1 border-b border-black ml-2 mb-0.5 h-3" />
          </div>
        </div>

        {/* Right: Master Receiver Anton Vodovatovskiy */}
        <div className="w-[52%] relative">
          <div className="flex items-baseline">
            <span className="font-semibold text-black whitespace-nowrap">
              Мастер-приемщик: Водоватовский Антон
            </span>
            <div className="flex-1 border-b border-black ml-2 mb-0.5 h-3" />
          </div>

          {/* Facsimile Overlay (Stamp + Signature) */}
          {isFacsimile && (
            <>
              {/* Authentic Blue Round Chaika Stamp */}
              <img
                src={stampImg}
                alt="Печать СТО Чайка"
                className="absolute -top-12 right-2 w-36 h-36 object-contain pointer-events-none select-none z-20"
                style={{
                  transform: "rotate(-3deg)",
                  mixBlendMode: "multiply",
                  opacity: 0.94,
                }}
              />

              {/* Authentic Large Blue Ink Pen Signature */}
              <img
                src={sigImg}
                alt="Подпись мастера"
                className="absolute -top-12 sm:-top-14 right-4 sm:right-8 w-48 h-28 sm:w-56 sm:h-32 object-contain pointer-events-none select-none z-30"
                style={{
                  transform: "rotate(-2deg)",
                  mixBlendMode: "multiply",
                  opacity: 0.96,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ServiceDocumentModal: React.FC<ServiceDocumentModalProps> = ({
  order,
  initialType = "work_order",
  isOpen,
  onClose,
  onSaveToArchive,
}) => {
  const [docType, setDocType] = useState<ServiceDocumentType>(initialType);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [archiveSaved, setArchiveSaved] = useState(false);
  const [isFacsimile, setIsFacsimile] = useState(true);
  const [isScanMode, setIsScanMode] = useState(false);
  const [sbpQrUrl, setSbpQrUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL("https://modul.udmpay.ru/13115", {
      margin: 1,
      width: 220,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (isMounted) setSbpQrUrl(url);
      })
      .catch((err) => console.warn("UDMPAY QR error:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isOpen) return null;

  const isPaid = order.paymentStatus === "paid";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportAutoServiceDocx(order, docType);
    } catch (err) {
      console.error("Docx export error:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleSaveArchive = () => {
    const docName = `${order.orderNumber}_${docType}_${order.vehicle.licensePlate}.docx`;
    if (onSaveToArchive) {
      onSaveToArchive(docName, docType);
    }

    if (typeof window !== "undefined") {
      const username = order.username || "admin";
      const archKey = `geo_ai_archive_${username}_v1`;
      try {
        const raw = localStorage.getItem(archKey);
        const existing = raw ? JSON.parse(raw) : [];
        const archiveItem = {
          id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: docName,
          category: "project_doc",
          fileType: "word",
          size: "1.8 МБ",
          source: "chat_generated",
          createdAt: new Date().toISOString().slice(0, 10),
          username,
          metadata: {
            licenseNumber: order.vehicle.licensePlate,
            description: `Документ автосервиса: ${docType === "work_order" ? "Заказ-наряд" : docType === "completion_act" ? "Акт выполненных работ" : "Документ СТО"} для ${order.client.name} (${order.vehicle.make} ${order.vehicle.model})`,
            tags: ["Чайка-Сервис", "Заказ-наряд", order.vehicle.licensePlate, order.client.name],
          },
        };
        localStorage.setItem(archKey, JSON.stringify([archiveItem, ...(Array.isArray(existing) ? existing : [])]));
        window.dispatchEvent(new Event("geo_ai_archive_updated"));
      } catch (e) {
        console.warn("Archive auto-save error:", e);
      }
    }

    setArchiveSaved(true);
    setTimeout(() => setArchiveSaved(false), 2500);
  };

  const tabs: Array<{ id: ServiceDocumentType; label: string; icon: any }> = [
    { id: "work_order", label: "1. Предварительный ЗН", icon: FileText },
    { id: "completion_act", label: "2. Заказ-наряд (Акт)", icon: FileCheck },
    { id: "acceptance_act", label: "3. Акт приема ТС (Осмотр)", icon: Car },
    { id: "payment_receipt", label: "4. Квитанция / Чек СБП", icon: Receipt },
    { id: "invoice", label: "5. Счет на оплату", icon: FileText },
    { id: "defect_sheet", label: "6. Дефектовка", icon: AlertCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none overflow-hidden">
        {/* Top Header Bar (Hidden on print) */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900/70 print:hidden">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-600/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center space-x-2">
                <span>{order.orderNumber}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono font-bold">
                  {order.vehicle.licensePlate}
                </span>
                {isPaid && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Оплачен
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {order.client.payerName || order.client.name} • {order.vehicle.make} {order.vehicle.model}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveArchive}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Сохранить в Единый электронный архив"
            >
              {archiveSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">В архиве!</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-3.5 h-3.5 text-red-500" />
                  <span>В архив</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Скачать документ Word (.docx)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? "Экспорт..." : "DOCX"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать А4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Type Selector Tabs (Hidden on print) */}
        <div className="px-5 py-2.5 border-b border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-950/70 flex items-center justify-between overflow-x-auto shrink-0 print:hidden gap-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = docType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDocType(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                    isActive
                      ? "bg-red-600 text-white font-semibold shadow-2xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Facsimile & Scan Mode Toggles */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFacsimile(!isFacsimile)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                isFacsimile
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 hover:text-zinc-800"
              }`}
              title="Наложить печать и подпись (Факсимиле)"
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>Печать и подпись</span>
            </button>

            <button
              type="button"
              onClick={() => setIsScanMode(!isScanMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                isScanMode
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 hover:text-zinc-800"
              }`}
              title="Эффект скана (Scan Mode)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Скан-эффект</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-200/70 dark:bg-black/60 print:bg-white print:p-0">
          <ServiceDocumentPrintSheet
            order={order}
            docType={docType}
            isFacsimile={isFacsimile}
            isScanMode={isScanMode}
            sbpQrUrl={sbpQrUrl}
          />
        </div>
      </div>
    </div>
  );
};
