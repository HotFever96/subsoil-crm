"use client";

import React, { useState } from "react";
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
  Sliders,
} from "lucide-react";
import { RepairOrder, ServiceDocumentType } from "@/lib/auto-service-types";
import { SERVICE_COMPANY_REQUISITES, formatCurrency, getStoRequisites, numberToWordsRu } from "@/lib/auto-service-data";
import { exportAutoServiceDocx } from "@/lib/auto-service-docx";
import { VehicleInspectionSchematic } from "./VehicleInspectionSchematic";
import { generateDefaultStampDataUrl, generateDefaultSignatureDataUrl } from "@/lib/canvas-image-processor";

interface ServiceDocumentModalProps {
  order: RepairOrder;
  initialType?: ServiceDocumentType;
  isOpen: boolean;
  onClose: () => void;
  onSaveToArchive?: (docName: string, docType: ServiceDocumentType) => void;
}

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

  if (!isOpen) return null;

  const req = getStoRequisites(order.username);
  const stampImg = req.stampUrl || generateDefaultStampDataUrl();
  const sigImg = req.signatureUrl || generateDefaultSignatureDataUrl();

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

    // Direct save to user archive localStorage
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
    { id: "work_order", label: "1. Заказ-наряд", icon: FileText },
    { id: "acceptance_act", label: "2. Акт приема ТС (Осмотр)", icon: Car },
    { id: "completion_act", label: "3. Акт выполненных работ", icon: FileCheck },
    { id: "payment_receipt", label: "4. Квитанция / Чек об оплате", icon: Receipt },
    { id: "invoice", label: "5. Счет на оплату", icon: FileText },
    { id: "defect_sheet", label: "6. Дефектовка", icon: AlertCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none overflow-hidden">
        {/* Top Header Bar (Hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#0a0f18] print:hidden">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center space-x-2">
                <span>{order.orderNumber}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold">
                  {order.vehicle.licensePlate}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {order.client.name} • {order.vehicle.make} {order.vehicle.model}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveArchive}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Type Selector Tabs (Hidden on print) */}
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0e141e] flex items-center justify-between overflow-x-auto shrink-0 print:hidden gap-3">
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
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
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
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:text-slate-800"
              }`}
              title="Наложить печать и подпись (Факсимиле)"
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>Факсимиле</span>
            </button>

            <button
              type="button"
              onClick={() => setIsScanMode(!isScanMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                isScanMode
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 hover:text-slate-800"
              }`}
              title="Эффект скана (Scan Mode)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Скан-эффект</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 dark:bg-[#070b10] print:bg-white print:p-0">
          <div
            id="printable-service-doc"
            className={`max-w-3xl mx-auto text-slate-900 p-8 sm:p-12 shadow-md print:shadow-none print:p-0 rounded-xl print:rounded-none font-sans text-xs leading-relaxed transition-all ${
              isScanMode
                ? "bg-[#faf9f5] border border-stone-300 filter contrast-[1.03] brightness-[0.99] sepia-[0.03]"
                : "bg-white"
            }`}
          >
            {/* Header with Brand Logo & Requisites */}
            {docType === "invoice" ? (
              /* Classical Bank Upper Box for Invoice (Счет на оплату) */
              <div className="mb-5 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-3">
                    <img
                      src="/logo-chaika-white.png"
                      alt="Чайка-Сервис"
                      className="h-9 w-auto object-contain filter invert shrink-0"
                    />
                    <div>
                      <span className="font-extrabold text-sm uppercase text-red-600">{req.brandName}</span>
                      <p className="text-[11px] text-slate-500">{req.name}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    Образец заполнения платежного поручения
                  </div>
                </div>

                <table className="w-full border-collapse border border-black text-xs">
                  <tbody>
                    <tr>
                      <td colSpan={2} rowSpan={2} className="border border-black p-2 align-top">
                        <div className="text-[10px] text-slate-500">Банк получателя:</div>
                        <div className="font-semibold">{req.bankName}</div>
                      </td>
                      <td className="border border-black p-1.5 w-20 text-[10px] text-slate-500">БИК</td>
                      <td className="border border-black p-1.5 font-mono font-semibold">{req.bik}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-[10px] text-slate-500">Сч. №</td>
                      <td className="border border-black p-1.5 font-mono font-semibold">{req.ks}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-[10px] text-slate-500 w-32">
                        ИНН {req.inn}
                      </td>
                      <td className="border border-black p-1.5 text-[10px] text-slate-500">
                        {req.kpp ? `КПП ${req.kpp}` : "КПП —"}
                      </td>
                      <td rowSpan={2} className="border border-black p-1.5 text-[10px] text-slate-500 align-top">
                        Сч. №
                      </td>
                      <td rowSpan={2} className="border border-black p-1.5 font-mono font-semibold align-top">
                        {req.rs}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-black p-2 align-top">
                        <div className="text-[10px] text-slate-500">Получатель:</div>
                        <div className="font-bold">{req.name}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              /* Standard Header for Work Order, Acceptance, Act, Receipt */
              <div className="border-b-2 border-red-600 pb-3 mb-4 flex justify-between items-start gap-4">
                <div className="flex items-start space-x-3.5">
                  <img
                    src="/logo-chaika-white.png"
                    alt="Чайка-Сервис"
                    className="h-10 w-auto max-w-[160px] object-contain filter invert shrink-0"
                  />
                  <div>
                    <h1 className="text-base font-extrabold text-red-600 uppercase tracking-wide">
                      {req.brandName}
                    </h1>
                    <p className="font-bold text-xs text-slate-900">{req.name}</p>
                    <p className="text-[11px] text-slate-600">{req.address}</p>
                    <p className="text-[11px] text-slate-600">Тел: {req.phone} • Email: {req.email}</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
                  <p>ИНН: <span className="font-bold text-slate-900">{req.inn}</span> {req.kpp ? `/ КПП: ${req.kpp}` : ""}</p>
                  <p>ОГРНИП: <span className="font-mono">{req.ogrn}</span></p>
                  <p>Р/с: <span className="font-mono">{req.rs}</span></p>
                  <p>{req.bankName} (БИК: {req.bik})</p>
                </div>
              </div>
            )}

            {/* Document Title Header */}
            <div className="text-center my-3 pb-2 border-b border-slate-200">
              <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
                {docType === "work_order" && `ДОГОВОР-ЗАКАЗ-НАРЯД № ${order.orderNumber}`}
                {docType === "acceptance_act" && `АКТ ПРИЕМА-ПЕРЕДАЧИ ТС К ЗАКАЗ-НАРЯДУ № ${order.orderNumber}`}
                {docType === "completion_act" && `АКТ ВЫПОЛНЕННЫХ РАБОТ № ${order.orderNumber}`}
                {docType === "payment_receipt" && `КВИТАНЦИЯ К ЗАКАЗ-НАРЯДУ № ${order.orderNumber} (ЧЕК ОБ ОПЛАТЕ)`}
                {docType === "invoice" && `СЧЕТ НА ОПЛАТУ № ${order.orderNumber}`}
                {docType === "defect_sheet" && `ДЕФЕКТОВОЧНАЯ ВЕДОМОСТЬ № ${order.orderNumber}`}
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">от {order.createdAt} г.</p>
            </div>

            {/* Parties Info */}
            {docType === "invoice" ? (
              <div className="space-y-1.5 text-xs mb-4">
                <div>
                  <span className="font-bold">Поставщик (Исполнитель): </span>
                  <span>{req.name}, ИНН {req.inn}, {req.address}, тел.: {req.phone}</span>
                </div>
                <div>
                  <span className="font-bold">Покупатель (Заказчик): </span>
                  <span>{order.client.name}, {order.client.inn ? `ИНН ${order.client.inn}, ` : ""}тел.: {order.client.phone}</span>
                </div>
                <div>
                  <span className="font-bold">Основание: </span>
                  <span>Заказ-наряд № {order.orderNumber} на ремонт ТС {order.vehicle.make} {order.vehicle.model} ({order.vehicle.licensePlate})</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Заказчик (Плательщик):</span>
                  <p className="font-bold text-slate-900">{order.client.name}</p>
                  <p className="text-slate-600">Тел: {order.client.phone || "—"}</p>
                  {order.client.inn && <p className="text-slate-600">ИНН: {order.client.inn}</p>}
                  {order.client.address && <p className="text-slate-600">Адрес: {order.client.address}</p>}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Транспортное средство:</span>
                  <p className="font-bold text-slate-900">
                    {order.vehicle.make} {order.vehicle.model} ({order.vehicle.year} г.)
                  </p>
                  <p className="text-slate-700">
                    Госномер: <strong className="font-mono font-bold text-slate-950">{order.vehicle.licensePlate}</strong>
                  </p>
                  {order.vehicle.vin && <p className="text-slate-600 text-[11px] font-mono">VIN: {order.vehicle.vin}</p>}
                  <p className="text-slate-600">Пробег: {order.vehicle.mileage ? order.vehicle.mileage.toLocaleString() : "—"} км</p>
                </div>

                {order.vehicle.complaints && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Причина обращения / Жалобы:</span>
                    <p className="text-slate-800 italic">{order.vehicle.complaints}</p>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENT BODY ACCORDING TO DOCTYPE */}

            {/* 1. PAYMENT RECEIPT SPECIFIC BODY */}
            {docType === "payment_receipt" && (
              <div className="space-y-4 mb-5">
                <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="font-bold text-xs text-emerald-900 uppercase">Платежная информация</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs tracking-wider">
                      ОПЛАЧЕНО ПОЛНОСТЬЮ
                    </span>
                  </div>

                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1 text-slate-600 w-44">Основание платежа:</td>
                        <td className="py-1 font-semibold text-slate-900">Оплата по заказ-наряду № {order.orderNumber} от {order.createdAt} г.</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1 text-slate-600">Плательщик:</td>
                        <td className="py-1 font-semibold text-slate-900">{order.client.name}</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1 text-slate-600">Способ оплаты:</td>
                        <td className="py-1 font-semibold text-slate-900">Безналичный расчет / Банковская карта / СБП</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1 text-slate-600">Налоговый режим:</td>
                        <td className="py-1 font-medium text-slate-700">УСН (Доходы), Патент. НДС не облагается (пп. 37 п. 3 ст. 149 НК РФ)</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-slate-900 text-sm">Сумма к оплате:</td>
                        <td className="py-1.5 font-extrabold text-emerald-700 text-base">{formatCurrency(order.grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="pt-2 border-t border-emerald-200 text-xs">
                    <span className="font-bold text-slate-900">Сумма прописью: </span>
                    <span className="italic font-medium text-slate-800">{numberToWordsRu(order.grandTotal)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Настоящая квитанция подтверждает факт поступления денежных средств в кассу / на расчетный счет предприятия в полном объеме.
                </div>
              </div>
            )}

            {/* 2. ACCEPTANCE ACT SPECIFIC BODY (Schematic) */}
            {docType === "acceptance_act" && (
              <div className="mb-5 p-3 rounded-lg border border-slate-300 bg-white">
                <VehicleInspectionSchematic inspection={order.inspection} readOnly={true} isPrint={true} />
              </div>
            )}

            {/* 3. DEFECT SHEET SPECIFIC BODY */}
            {docType === "defect_sheet" && (
              <div className="space-y-4 mb-5">
                <div className="font-bold text-slate-900 text-xs">Ведомость выявленных дефектов узлов и агрегатов:</div>
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="p-1.5 border border-black w-8 text-center">№</th>
                      <th className="p-1.5 border border-black w-32">Узел / Система</th>
                      <th className="p-1.5 border border-black">Описание неисправности / Износ</th>
                      <th className="p-1.5 border border-black w-36">Рекомендуемые работы</th>
                      <th className="p-1.5 border border-black w-24 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1.5 border border-black text-center">1</td>
                      <td className="p-1.5 border border-black font-semibold">Передняя подвеска</td>
                      <td className="p-1.5 border border-black">{order.vehicle.complaints || "Люфт поворотного кулака, повреждение пыльника"}</td>
                      <td className="p-1.5 border border-black">Замена кулака в сборе, сход-развал</td>
                      <td className="p-1.5 border border-black text-center font-bold text-red-600">Критично</td>
                    </tr>
                    {order.works.map((w, idx) => (
                      <tr key={idx + 2}>
                        <td className="p-1.5 border border-black text-center">{idx + 2}</td>
                        <td className="p-1.5 border border-black font-semibold">Ходовая часть / ТО</td>
                        <td className="p-1.5 border border-black">{w.name}</td>
                        <td className="p-1.5 border border-black">Устранение в рамках ЗН</td>
                        <td className="p-1.5 border border-black text-center text-slate-700">В работе</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-slate-900">Заключение технического эксперта СТО: </span>
                  <p className="italic text-slate-800">
                    {order.recommendations || "Эксплуатация ТС до устранения неисправностей рулевого управления и подвески не рекомендуется согласно ПДД РФ. Требуется обязательная регулировка углов установки колес."}
                  </p>
                </div>
              </div>
            )}

            {/* 4. WORKS TABLE (For work_order, completion_act, invoice) */}
            {(docType === "work_order" || docType === "completion_act" || docType === "invoice") && (
              <div className="mb-4">
                <h3 className="font-bold text-slate-900 mb-1.5 flex justify-between text-xs">
                  <span>1. Выполненные работы / услуги:</span>
                  <span className="text-slate-500 font-normal">Ставка: {req.defaultRatePerHour} ₽/Н·Ч</span>
                </h3>
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="p-1.5 border border-black w-8 text-center">№</th>
                      <th className="p-1.5 border border-black">Наименование работы</th>
                      <th className="p-1.5 border border-black w-24">Исполнитель</th>
                      <th className="p-1.5 border border-black w-14 text-center">Н/Ч</th>
                      <th className="p-1.5 border border-black w-20 text-right">Ставка</th>
                      <th className="p-1.5 border border-black w-24 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.works.map((w, idx) => (
                      <tr key={w.id || idx}>
                        <td className="p-1.5 border border-black text-center">{idx + 1}</td>
                        <td className="p-1.5 border border-black font-medium">{w.name}</td>
                        <td className="p-1.5 border border-black text-slate-600">{w.mechanic || "Водоватовский А.И."}</td>
                        <td className="p-1.5 border border-black text-center font-bold">{w.laborHours}</td>
                        <td className="p-1.5 border border-black text-right">{w.ratePerHour} ₽</td>
                        <td className="p-1.5 border border-black text-right font-semibold">{w.total.toLocaleString()} ₽</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={5} className="p-1.5 border border-black text-right">
                        Итого по работам:
                      </td>
                      <td className="p-1.5 border border-black text-right font-bold text-slate-950">
                        {order.totalWorks.toLocaleString()} ₽
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. PARTS TABLE (For work_order, completion_act, invoice) */}
            {(docType === "work_order" || docType === "completion_act" || docType === "invoice") && order.parts.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-slate-900 mb-1.5 text-xs">2. Запасные части и материалы:</h3>
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="p-1.5 border border-black w-8 text-center">№</th>
                      <th className="p-1.5 border border-black w-28">Артикул OEM</th>
                      <th className="p-1.5 border border-black">Наименование детали</th>
                      <th className="p-1.5 border border-black w-16 text-center">Кол-во</th>
                      <th className="p-1.5 border border-black w-20 text-right">Цена</th>
                      <th className="p-1.5 border border-black w-24 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.parts.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td className="p-1.5 border border-black text-center">{idx + 1}</td>
                        <td className="p-1.5 border border-black font-mono text-[11px] text-slate-600">{p.oem || "—"}</td>
                        <td className="p-1.5 border border-black font-medium">{p.name}</td>
                        <td className="p-1.5 border border-black text-center">{p.qty} {p.unit}</td>
                        <td className="p-1.5 border border-black text-right">{p.salePrice.toLocaleString()} ₽</td>
                        <td className="p-1.5 border border-black text-right font-semibold">{p.total.toLocaleString()} ₽</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={5} className="p-1.5 border border-black text-right">
                        Итого по запчастям:
                      </td>
                      <td className="p-1.5 border border-black text-right font-bold text-slate-950">
                        {order.totalParts.toLocaleString()} ₽
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Due & Sum in Words */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-1.5 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-slate-900">
                  {docType === "invoice" ? "ВСЕГО К ОПЛАТЕ:" : "ИТОГО К ОПЛАТЕ:"}
                </span>
                <span className="font-black text-base text-red-600">
                  {formatCurrency(order.grandTotal)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 border-t border-slate-200 pt-1.5">
                <span className="font-bold text-slate-900">Сумма прописью: </span>
                <span className="italic font-medium text-slate-800">{numberToWordsRu(order.grandTotal)}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                НДС не облагается (в соответствии с пп. 37 п. 3 ст. 149 НК РФ, УСН / Патент).
              </div>
            </div>

            {/* Recommendations / Legal terms */}
            {docType === "completion_act" && (
              <div className="text-[11px] text-slate-600 mb-4 p-2 bg-slate-50 border border-slate-200 rounded">
                Вышеперечисленные работы (услуги) выполнены полностью и в срок. Заказчик претензий по объему, качеству и срокам оказания услуг не имеет.
              </div>
            )}

            {order.recommendations && docType !== "defect_sheet" && (
              <div className="mb-3 text-xs text-slate-700">
                <strong>Рекомендации клиенту:</strong> {order.recommendations}
              </div>
            )}

            {/* Warranty Terms */}
            {docType === "work_order" && (
              <div className="text-[11px] text-slate-500 mb-6 border-t border-slate-200 pt-2 leading-relaxed">
                <p>
                  Гарантийные обязательства: на работы по слесарному ремонту — {order.warrantyDaysWorks || 30} дней или 1 000 км пробега, на установленные оригинальные запасные части — {order.warrantyDaysParts || 14} дней. Претензии по комплектности и внешнему виду принимаются исключительно в момент получения автомобиля.
                </p>
              </div>
            )}

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t-2 border-slate-300">
              <div>
                <p className="font-bold text-slate-900">
                  {docType === "invoice" ? "Предприниматель / Руководитель:" : "Исполнитель / Мастер-приемщик:"}
                </p>
                <p className="text-slate-600 mb-6">{req.director} / {req.masterReceiver}</p>

                <div className="relative inline-block">
                  {isFacsimile && (
                    <>
                      {sigImg && (
                        <img
                          src={sigImg}
                          alt="Подпись"
                          className="absolute -top-7 left-2 w-32 h-12 object-contain pointer-events-none select-none z-10"
                          style={{ mixBlendMode: "multiply" }}
                        />
                      )}
                      {stampImg && (
                        <img
                          src={stampImg}
                          alt="Оттиск печати"
                          className="absolute -top-10 left-20 w-28 h-28 object-contain pointer-events-none select-none z-20"
                          style={{
                            transform: "rotate(-2.5deg)",
                            mixBlendMode: "multiply",
                            opacity: 0.94,
                          }}
                        />
                      )}
                    </>
                  )}
                  <div className="border-b border-black w-48 mb-1" />
                </div>
                <p className="text-[10px] text-slate-500">Подпись / М.П.</p>
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  {docType === "payment_receipt" ? "Плательщик:" : "Заказчик (представитель):"}
                </p>
                <p className="text-slate-600 mb-6">{order.client.name}</p>
                <div className="border-b border-black w-48 mb-1" />
                <p className="text-[10px] text-slate-500">
                  {docType === "payment_receipt" ? "Оплату произвел" : "С объемом и стоимостью работ согласен"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
