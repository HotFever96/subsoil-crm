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
} from "lucide-react";
import { RepairOrder, ServiceDocumentType } from "@/lib/auto-service-types";
import { SERVICE_COMPANY_REQUISITES, formatCurrency, getStoRequisites } from "@/lib/auto-service-data";
import { exportAutoServiceDocx } from "@/lib/auto-service-docx";
import { VehicleInspectionSchematic } from "./VehicleInspectionSchematic";

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

  if (!isOpen) return null;

  const req = getStoRequisites(order.username);

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
    { id: "work_order", label: "Заказ-наряд", icon: FileText },
    { id: "acceptance_act", label: "Акт приема ТС", icon: Car },
    { id: "completion_act", label: "Акт выполненных работ", icon: FileCheck },
    { id: "invoice", label: "Счет на оплату", icon: Receipt },
    { id: "defect_sheet", label: "Дефектовка", icon: AlertCircle },
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
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0e141e] flex items-center space-x-1.5 overflow-x-auto shrink-0 print:hidden">
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

        {/* Scrollable Printable A4 Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 dark:bg-[#070b10] print:bg-white print:p-0">
          <div
            id="printable-service-doc"
            className="max-w-3xl mx-auto bg-white text-slate-900 p-8 sm:p-12 shadow-md print:shadow-none print:p-0 rounded-xl print:rounded-none font-sans text-xs leading-relaxed"
          >
            {/* Header with Brand Logo & Requisites */}
            <div className="border-b-2 border-red-600 pb-4 mb-5 flex justify-between items-start gap-4">
              <div className="flex items-start space-x-4">
                <img
                  src="/logo-chaika-white.png"
                  alt="Чайка-Сервис"
                  className="h-11 w-auto max-w-[170px] object-contain filter invert shrink-0"
                />
                <div>
                  <h1 className="text-base font-extrabold text-red-600 uppercase tracking-wide">
                    {req.brandName}
                  </h1>
                  <p className="font-semibold text-xs text-slate-800">{req.name}</p>
                  <p className="text-[11px] text-slate-600">{req.address}</p>
                  <p className="text-[11px] text-slate-600">Тел: {req.phone} • Email: {req.email}</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500 space-y-0.5 shrink-0">
                <p>ИНН: <span className="font-semibold text-slate-800">{req.inn}</span> / КПП: {req.kpp}</p>
                <p>ОГРН: {req.ogrn}</p>
                <p>Р/с: {req.rs}</p>
                <p>Банк: {req.bankName} (БИК: {req.bik})</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-4">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                {docType === "work_order" && `ЗАКАЗ-НАРЯД № ${order.orderNumber}`}
                {docType === "acceptance_act" && `АКТ ПРИЕМА-ПЕРЕДАЧИ ТС К ЗАКАЗ-НАРЯДУ № ${order.orderNumber}`}
                {docType === "completion_act" && `АКТ ВЫПОЛНЕННЫХ РАБОТ № ${order.orderNumber}`}
                {docType === "invoice" && `СЧЕТ НА ОПЛАТУ № ${order.orderNumber}`}
                {docType === "defect_sheet" && `ДЕФЕКТОВОЧНАЯ ВЕДОМОСТЬ № ${order.orderNumber}`}
              </h2>
              <p className="text-xs text-slate-500 font-medium">от {order.createdAt} г.</p>
            </div>

            {/* Client & Vehicle Card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Заказчик:</span>
                <p className="font-bold text-slate-900">{order.client.name}</p>
                <p className="text-slate-600">Тел: {order.client.phone}</p>
                {order.client.inn && <p className="text-slate-600">ИНН: {order.client.inn}</p>}
                {order.client.address && <p className="text-slate-600">Адрес: {order.client.address}</p>}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Автомобиль:</span>
                <p className="font-bold text-slate-900">
                  {order.vehicle.make} {order.vehicle.model} ({order.vehicle.year} г.)
                </p>
                <p className="text-slate-700">
                  Госномер: <strong className="font-bold text-slate-950">{order.vehicle.licensePlate}</strong>
                </p>
                <p className="text-slate-600 text-[11px] font-mono">VIN: {order.vehicle.vin}</p>
                <p className="text-slate-600">Пробег: {order.vehicle.mileage.toLocaleString()} км</p>
              </div>

              {order.vehicle.complaints && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Причина обращения:</span>
                  <p className="text-slate-800 italic">{order.vehicle.complaints}</p>
                </div>
              )}
            </div>

            {/* Acceptance Act Specific Block with Schematic */}
            {docType === "acceptance_act" && (
              <div className="mb-5 p-3 rounded-lg border border-slate-300 bg-white">
                <VehicleInspectionSchematic inspection={order.inspection} readOnly={true} isPrint={true} />
              </div>
            )}

            {/* 1. Works Table */}
            <div className="mb-5">
              <h3 className="font-bold text-slate-900 mb-1.5 flex justify-between">
                <span>1. Выполненные работы / услуги:</span>
                <span className="text-slate-500 font-normal">Ставка: {SERVICE_COMPANY_REQUISITES.defaultRatePerHour} ₽/Н·Ч</span>
              </h3>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-1.5 border border-slate-300 w-8 text-center">№</th>
                    <th className="p-1.5 border border-slate-300">Наименование работы</th>
                    <th className="p-1.5 border border-slate-300 w-24">Мастер</th>
                    <th className="p-1.5 border border-slate-300 w-14 text-center">Н/Ч</th>
                    <th className="p-1.5 border border-slate-300 w-20 text-right">Ставка</th>
                    <th className="p-1.5 border border-slate-300 w-24 text-right">Сумма (₽)</th>
                  </tr>
                </thead>
                <tbody>
                  {order.works.map((w, idx) => (
                    <tr key={w.id || idx}>
                      <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-300 font-medium">{w.name}</td>
                      <td className="p-1.5 border border-slate-300 text-slate-600">{w.mechanic || "—"}</td>
                      <td className="p-1.5 border border-slate-300 text-center">{w.laborHours}</td>
                      <td className="p-1.5 border border-slate-300 text-right">{w.ratePerHour}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-semibold">{w.total.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={5} className="p-1.5 border border-slate-300 text-right">
                      Итого по работам:
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-bold text-slate-950">
                      {order.totalWorks.toLocaleString()} ₽
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Parts Table */}
            {order.parts.length > 0 && (
              <div className="mb-5">
                <h3 className="font-bold text-slate-900 mb-1.5">2. Запасные части и материалы:</h3>
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-1.5 border border-slate-300 w-8 text-center">№</th>
                      <th className="p-1.5 border border-slate-300 w-28">Артикул OEM</th>
                      <th className="p-1.5 border border-slate-300">Наименование детали</th>
                      <th className="p-1.5 border border-slate-300 w-16 text-center">Кол-во</th>
                      <th className="p-1.5 border border-slate-300 w-20 text-right">Цена (₽)</th>
                      <th className="p-1.5 border border-slate-300 w-24 text-right">Сумма (₽)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.parts.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                        <td className="p-1.5 border border-slate-300 font-mono text-[11px] text-slate-600">{p.oem || "—"}</td>
                        <td className="p-1.5 border border-slate-300 font-medium">{p.name}</td>
                        <td className="p-1.5 border border-slate-300 text-center">{p.qty} {p.unit}</td>
                        <td className="p-1.5 border border-slate-300 text-right">{p.salePrice.toLocaleString()}</td>
                        <td className="p-1.5 border border-slate-300 text-right font-semibold">{p.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={5} className="p-1.5 border border-slate-300 text-right">
                        Итого по запчастям:
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-bold text-slate-950">
                        {order.totalParts.toLocaleString()} ₽
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Due */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center mb-5">
              <span className="font-bold text-sm text-slate-900">ИТОГО К ОПЛАТЕ:</span>
              <span className="font-extrabold text-lg text-red-600">
                {formatCurrency(order.grandTotal)}
              </span>
            </div>

            {/* Recommendations */}
            {order.recommendations && (
              <div className="mb-4 text-xs text-slate-700">
                <strong>Рекомендации клиенту:</strong> {order.recommendations}
              </div>
            )}

            {/* Warranty Terms */}
            <div className="text-[11px] text-slate-500 mb-8 border-t border-slate-200 pt-3 leading-relaxed">
              <p>
                Гарантийные обязательства: на работы по слесарному ремонту — {order.warrantyDaysWorks || 30} дней или 1 000 км пробега, на установленные оригинальные запасные части — {order.warrantyDaysParts || 14} дней. Претензии по комплектности и внешнему виду принимаются исключительно в момент получения автомобиля.
              </p>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
              <div>
                <p className="font-bold text-slate-900">Исполнитель:</p>
                <p className="text-slate-600 mb-6">Мастер-приемщик {order.masterName || req.masterReceiver}</p>
                <div className="border-b border-slate-400 w-44 mb-1" />
                <p className="text-[10px] text-slate-400">Подпись / М.П.</p>
              </div>

              <div>
                <p className="font-bold text-slate-900">Заказчик:</p>
                <p className="text-slate-600 mb-6">{order.client.name}</p>
                <div className="border-b border-slate-400 w-44 mb-1" />
                <p className="text-[10px] text-slate-400">С объемом и стоимостью работ согласен</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
