"use client";

import React, { useState } from "react";
import {
  Car,
  Truck,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  Fuel,
  Info,
  ShieldAlert,
} from "lucide-react";
import {
  VehicleInspectionData,
  DamagePoint,
  DamageType,
} from "@/lib/auto-service-types";

interface VehicleInspectionSchematicProps {
  inspection?: VehicleInspectionData;
  onChange?: (inspection: VehicleInspectionData) => void;
  readOnly?: boolean;
}

const DEFAULT_INSPECTION: VehicleInspectionData = {
  vehicleBodyType: "car",
  fuelLevel: "1/2",
  equipment: {
    sts: true,
    keysCount: 1,
    spareWheel: true,
    jack: true,
    firstAidKit: false,
    warningTriangle: true,
    dashcam: false,
  },
  isDirty: false,
  damages: [],
};

export const VehicleInspectionSchematic: React.FC<VehicleInspectionSchematicProps> = ({
  inspection = DEFAULT_INSPECTION,
  onChange,
  readOnly = false,
}) => {
  const current = inspection || DEFAULT_INSPECTION;
  const [selectedDamageType, setSelectedDamageType] = useState<DamageType>("scratch");
  const [damageNote, setDamageNote] = useState("");

  const damageTypesMeta: Record<DamageType, { label: "Ц" | "В" | "С" | "К"; title: string; color: string; bg: string }> = {
    scratch: { label: "Ц", title: "Царапина (Ц)", color: "text-amber-500", bg: "bg-amber-500" },
    dent: { label: "В", title: "Вмятина (В)", color: "text-blue-500", bg: "bg-blue-500" },
    chip: { label: "С", title: "Скол (С)", color: "text-rose-500", bg: "bg-rose-500" },
    rust: { label: "К", title: "Коррозия (К)", color: "text-orange-500", bg: "bg-orange-500" },
  };

  const updateState = (updated: Partial<VehicleInspectionData>) => {
    if (readOnly || !onChange) return;
    onChange({
      ...current,
      ...updated,
    });
  };

  const handleSvgClick = (view: "top" | "side_left" | "side_right" | "front" | "rear", e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newMarker: DamagePoint = {
      id: `dmg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: selectedDamageType,
      label: damageTypesMeta[selectedDamageType].label,
      x,
      y,
      view,
      note: damageNote.trim() || undefined,
    };

    updateState({
      damages: [...(current.damages || []), newMarker],
    });
    setDamageNote("");
  };

  const removeDamage = (id: string) => {
    if (readOnly || !onChange) return;
    updateState({
      damages: (current.damages || []).filter((d) => d.id !== id),
    });
  };

  const clearAllDamages = () => {
    if (readOnly || !onChange) return;
    updateState({ damages: [] });
  };

  const isCar = current.vehicleBodyType === "car";

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Top Toolbar: Vehicle Type & Selected Damage Marker */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
        {/* Body Type Toggle */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700 dark:text-zinc-300">Тип кузова:</span>
          <div className="flex items-center bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => updateState({ vehicleBodyType: "car" })}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isCar
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Легковой</span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => updateState({ vehicleBodyType: "van_truck" })}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                !isCar
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Грузовой / Фургон</span>
            </button>
          </div>
        </div>

        {/* Damage Marker Selector */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 mr-1">Дефект:</span>
            {(["scratch", "dent", "chip", "rust"] as DamageType[]).map((t) => {
              const meta = damageTypesMeta[t];
              const isSelected = selectedDamageType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedDamageType(t)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-transparent shadow-xs"
                      : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${meta.bg} text-white flex items-center justify-center text-[10px] font-bold`}>
                    {meta.label}
                  </span>
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SVG Interactive Schematics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* VIEW 1: TOP (Сверху) */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
              1. Вид сверху (Крыша, капот, багажник)
            </span>
            <span className="text-[10px] text-slate-400">Клик для отметки</span>
          </div>

          <div className="relative aspect-4/3 bg-slate-50 dark:bg-zinc-950/60 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800 flex items-center justify-center overflow-hidden cursor-crosshair">
            <svg
              viewBox="0 0 200 280"
              onClick={(e) => handleSvgClick("top", e)}
              className="w-full h-full max-h-[220px]"
            >
              {isCar ? (
                // Car Top Silhouette
                <g stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-600 dark:text-zinc-400">
                  <path d="M 60,30 Q 100,20 140,30 Q 155,50 155,100 L 155,200 Q 155,250 140,260 Q 100,268 60,260 Q 45,250 45,200 L 45,100 Q 45,50 60,30 Z" />
                  {/* Windshield */}
                  <path d="M 52,90 Q 100,80 148,90 Q 142,125 140,130 Q 100,125 60,130 Q 58,125 52,90 Z" fill="currentColor" fillOpacity="0.08" />
                  {/* Rear window */}
                  <path d="M 55,200 Q 100,208 145,200 Q 148,225 142,230 Q 100,225 58,230 Q 52,225 55,200 Z" fill="currentColor" fillOpacity="0.08" />
                  {/* Roof */}
                  <rect x="58" y="135" width="84" height="60" rx="6" strokeDasharray="3 3" />
                  {/* Hood lines */}
                  <line x1="70" y1="35" x2="70" y2="80" strokeWidth="1.5" />
                  <line x1="130" y1="35" x2="130" y2="80" strokeWidth="1.5" />
                  {/* Mirrors */}
                  <path d="M 45,95 L 30,100 L 30,110 L 45,105 Z" fill="currentColor" fillOpacity="0.3" />
                  <path d="M 155,95 L 170,100 L 170,110 L 155,105 Z" fill="currentColor" fillOpacity="0.3" />
                </g>
              ) : (
                // Van / Truck Top Silhouette
                <g stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-600 dark:text-zinc-400">
                  <rect x="45" y="25" width="110" height="235" rx="8" />
                  {/* Cabin windshield */}
                  <path d="M 52,35 L 148,35 L 145,75 L 55,75 Z" fill="currentColor" fillOpacity="0.12" />
                  {/* Cargo box divider */}
                  <line x1="45" y1="95" x2="155" y2="95" strokeWidth="3" />
                  {/* Cargo roof ribs */}
                  <line x1="50" y1="135" x2="150" y2="135" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="50" y1="175" x2="150" y2="175" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="50" y1="215" x2="150" y2="215" strokeWidth="1.5" strokeDasharray="4 4" />
                  {/* Mirrors */}
                  <rect x="25" y="50" width="18" height="10" rx="2" fill="currentColor" fillOpacity="0.3" />
                  <rect x="157" y="50" width="18" height="10" rx="2" fill="currentColor" fillOpacity="0.3" />
                </g>
              )}
            </svg>

            {/* Placed Markers for TOP */}
            {(current.damages || [])
              .filter((d) => d.view === "top")
              .map((d) => (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDamage(d.id);
                  }}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                  title={`${damageTypesMeta[d.type].title} (Клик для удаления)`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${damageTypesMeta[d.type].bg} text-white font-extrabold text-[10px] flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 cursor-pointer hover:scale-125 transition-transform`}
                >
                  {d.label}
                </div>
              ))}
          </div>
        </div>

        {/* VIEW 2: SIDE LEFT (Левый борт) */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
              2. Левый борт (Двери, крылья, порог)
            </span>
            <span className="text-[10px] text-slate-400">Клик для отметки</span>
          </div>

          <div className="relative aspect-4/3 bg-slate-50 dark:bg-zinc-950/60 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800 flex items-center justify-center overflow-hidden cursor-crosshair">
            <svg
              viewBox="0 0 280 140"
              onClick={(e) => handleSvgClick("side_left", e)}
              className="w-full h-full max-h-[220px]"
            >
              <g stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-600 dark:text-zinc-400">
                {isCar ? (
                  // Car Side Profile
                  <>
                    <path d="M 20,95 L 35,95 Q 40,65 65,65 Q 90,65 95,95 L 185,95 Q 190,65 215,65 Q 240,65 245,95 L 265,95 L 265,80 Q 255,65 220,60 L 175,35 Q 130,30 100,35 L 55,60 Q 20,70 20,95 Z" />
                    {/* Wheels */}
                    <circle cx="65" cy="95" r="20" strokeWidth="3" />
                    <circle cx="215" cy="95" r="20" strokeWidth="3" />
                    {/* Windows */}
                    <path d="M 100,42 L 145,42 L 145,62 L 68,62 Z" fill="currentColor" fillOpacity="0.1" />
                    <path d="M 152,42 L 185,42 L 210,62 L 152,62 Z" fill="currentColor" fillOpacity="0.1" />
                    {/* Door lines */}
                    <line x1="148" y1="42" x2="148" y2="92" strokeWidth="1.5" />
                    <line x1="90" y1="62" x2="90" y2="92" strokeWidth="1.5" />
                    <line x1="205" y1="62" x2="205" y2="92" strokeWidth="1.5" />
                  </>
                ) : (
                  // Van Side Profile
                  <>
                    <path d="M 20,95 L 45,95 Q 50,65 75,65 Q 100,65 105,95 L 195,95 Q 200,65 225,65 Q 250,65 255,95 L 270,95 L 270,30 L 105,30 L 70,55 L 20,65 Z" />
                    <circle cx="75" cy="95" r="22" strokeWidth="3" />
                    <circle cx="225" cy="95" r="22" strokeWidth="3" />
                    <path d="M 75,40 L 100,38 L 100,60 L 60,60 Z" fill="currentColor" fillOpacity="0.1" />
                    <line x1="105" y1="30" x2="105" y2="95" strokeWidth="2.5" />
                    <line x1="185" y1="30" x2="185" y2="95" strokeWidth="1.5" strokeDasharray="3 3" />
                  </>
                )}
              </g>
            </svg>

            {(current.damages || [])
              .filter((d) => d.view === "side_left")
              .map((d) => (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDamage(d.id);
                  }}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                  title={`${damageTypesMeta[d.type].title} (Клик для удаления)`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${damageTypesMeta[d.type].bg} text-white font-extrabold text-[10px] flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 cursor-pointer hover:scale-125 transition-transform`}
                >
                  {d.label}
                </div>
              ))}
          </div>
        </div>

        {/* VIEW 3: SIDE RIGHT (Правый борт) */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
              3. Правый борт (Двери, крылья, лючок)
            </span>
            <span className="text-[10px] text-slate-400">Клик для отметки</span>
          </div>

          <div className="relative aspect-4/3 bg-slate-50 dark:bg-zinc-950/60 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800 flex items-center justify-center overflow-hidden cursor-crosshair">
            <svg
              viewBox="0 0 280 140"
              onClick={(e) => handleSvgClick("side_right", e)}
              className="w-full h-full max-h-[220px]"
            >
              {/* Mirrored side */}
              <g stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-600 dark:text-zinc-400" transform="scale(-1, 1) translate(-280, 0)">
                {isCar ? (
                  <>
                    <path d="M 20,95 L 35,95 Q 40,65 65,65 Q 90,65 95,95 L 185,95 Q 190,65 215,65 Q 240,65 245,95 L 265,95 L 265,80 Q 255,65 220,60 L 175,35 Q 130,30 100,35 L 55,60 Q 20,70 20,95 Z" />
                    <circle cx="65" cy="95" r="20" strokeWidth="3" />
                    <circle cx="215" cy="95" r="20" strokeWidth="3" />
                    <path d="M 100,42 L 145,42 L 145,62 L 68,62 Z" fill="currentColor" fillOpacity="0.1" />
                    <path d="M 152,42 L 185,42 L 210,62 L 152,62 Z" fill="currentColor" fillOpacity="0.1" />
                    <line x1="148" y1="42" x2="148" y2="92" strokeWidth="1.5" />
                  </>
                ) : (
                  <>
                    <path d="M 20,95 L 45,95 Q 50,65 75,65 Q 100,65 105,95 L 195,95 Q 200,65 225,65 Q 250,65 255,95 L 270,95 L 270,30 L 105,30 L 70,55 L 20,65 Z" />
                    <circle cx="75" cy="95" r="22" strokeWidth="3" />
                    <circle cx="225" cy="95" r="22" strokeWidth="3" />
                    <path d="M 75,40 L 100,38 L 100,60 L 60,60 Z" fill="currentColor" fillOpacity="0.1" />
                    <line x1="105" y1="30" x2="105" y2="95" strokeWidth="2.5" />
                  </>
                )}
              </g>
            </svg>

            {(current.damages || [])
              .filter((d) => d.view === "side_right")
              .map((d) => (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDamage(d.id);
                  }}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                  title={`${damageTypesMeta[d.type].title} (Клик для удаления)`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${damageTypesMeta[d.type].bg} text-white font-extrabold text-[10px] flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 cursor-pointer hover:scale-125 transition-transform`}
                >
                  {d.label}
                </div>
              ))}
          </div>
        </div>

        {/* VIEW 4: FRONT (Передняя часть) */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
              4. Перед (Бампер, решетка, фары, стекло)
            </span>
            <span className="text-[10px] text-slate-400">Клик для отметки</span>
          </div>

          <div className="relative aspect-4/3 bg-slate-50 dark:bg-zinc-950/60 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800 flex items-center justify-center overflow-hidden cursor-crosshair">
            <svg
              viewBox="0 0 200 160"
              onClick={(e) => handleSvgClick("front", e)}
              className="w-full h-full max-h-[220px]"
            >
              <g stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-600 dark:text-zinc-400">
                <path d="M 35,130 Q 30,115 35,95 Q 40,50 65,35 Q 100,25 135,35 Q 160,50 165,95 Q 170,115 165,130 Z" />
                {/* Windshield */}
                <path d="M 55,42 Q 100,32 145,42 L 140,80 Q 100,75 60,80 Z" fill="currentColor" fillOpacity="0.1" />
                {/* Grille */}
                <rect x="75" y="95" width="50" height="25" rx="3" strokeWidth="1.5" />
                {/* Headlights */}
                <path d="M 40,95 Q 60,90 70,105 L 45,115 Z" fill="currentColor" fillOpacity="0.15" />
                <path d="M 160,95 Q 140,90 130,105 L 155,115 Z" fill="currentColor" fillOpacity="0.15" />
                {/* License plate */}
                <rect x="80" y="125" width="40" height="12" rx="1" strokeWidth="1.2" />
              </g>
            </svg>

            {(current.damages || [])
              .filter((d) => d.view === "front")
              .map((d) => (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDamage(d.id);
                  }}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                  title={`${damageTypesMeta[d.type].title} (Клик для удаления)`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${damageTypesMeta[d.type].bg} text-white font-extrabold text-[10px] flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 cursor-pointer hover:scale-125 transition-transform`}
                >
                  {d.label}
                </div>
              ))}
          </div>
        </div>

        {/* VIEW 5: REAR (Задняя часть) */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
              5. Задняя часть (Бампер, фонари, багажник)
            </span>
            <span className="text-[10px] text-slate-400">Клик для отметки</span>
          </div>

          <div className="relative aspect-4/3 bg-slate-50 dark:bg-zinc-950/60 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800 flex items-center justify-center overflow-hidden cursor-crosshair">
            <svg
              viewBox="0 0 200 160"
              onClick={(e) => handleSvgClick("rear", e)}
              className="w-full h-full max-h-[220px]"
            >
              <g stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-600 dark:text-zinc-400">
                <path d="M 35,130 Q 30,115 35,95 Q 40,50 65,35 Q 100,25 135,35 Q 160,50 165,95 Q 170,115 165,130 Z" />
                {/* Rear Window */}
                <path d="M 55,42 Q 100,34 145,42 L 142,75 Q 100,70 58,75 Z" fill="currentColor" fillOpacity="0.1" />
                {/* Tail lights */}
                <rect x="36" y="90" width="22" height="18" rx="2" fill="currentColor" fillOpacity="0.2" />
                <rect x="142" y="90" width="22" height="18" rx="2" fill="currentColor" fillOpacity="0.2" />
                {/* Trunk cut line */}
                <line x1="60" y1="80" x2="60" y2="125" strokeWidth="1.5" />
                <line x1="140" y1="80" x2="140" y2="125" strokeWidth="1.5" />
                <line x1="60" y1="125" x2="140" y2="125" strokeWidth="1.5" />
                {/* License plate */}
                <rect x="80" y="105" width="40" height="12" rx="1" strokeWidth="1.2" />
              </g>
            </svg>

            {(current.damages || [])
              .filter((d) => d.view === "rear")
              .map((d) => (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDamage(d.id);
                  }}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                  title={`${damageTypesMeta[d.type].title} (Клик для удаления)`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${damageTypesMeta[d.type].bg} text-white font-extrabold text-[10px] flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 cursor-pointer hover:scale-125 transition-transform`}
                >
                  {d.label}
                </div>
              ))}
          </div>
        </div>

        {/* VIEW 6: SUMMARY & MARKERS LIST */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
                Зафиксированные дефекты ({current.damages?.length || 0})
              </span>
              {(current.damages?.length || 0) > 0 && !readOnly && (
                <button
                  type="button"
                  onClick={clearAllDamages}
                  className="text-rose-500 hover:underline text-[10px] font-semibold"
                >
                  Очистить все
                </button>
              )}
            </div>

            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
              {(current.damages || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Info className="w-5 h-5 mx-auto mb-1 opacity-50" />
                  <span>Повреждений кузова не отмечено</span>
                </div>
              ) : (
                current.damages.map((d, idx) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-4 h-4 rounded-full ${damageTypesMeta[d.type].bg} text-white font-bold text-[10px] flex items-center justify-center`}>
                        {d.label}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          {idx + 1}. {damageTypesMeta[d.type].title}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {d.view === "top" ? "Сверху" : d.view === "side_left" ? "Лев. борт" : d.view === "side_right" ? "Прав. борт" : d.view === "front" ? "Спереди" : "Сзади"} ({d.x}%, {d.y}%)
                          {d.note && ` • ${d.note}`}
                        </div>
                      </div>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeDamage(d.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500">
            Обозначения: <strong className="text-amber-500">Ц</strong> — Царапина, <strong className="text-blue-500">В</strong> — Вмятина, <strong className="text-rose-500">С</strong> — Скол, <strong className="text-orange-500">К</strong> — Коррозия
          </div>
        </div>
      </div>

      {/* Fuel Level & Equipment Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
        {/* Fuel Level */}
        <div>
          <label className="font-bold text-slate-800 dark:text-zinc-200 flex items-center space-x-1.5 mb-2">
            <Fuel className="w-4 h-4 text-amber-500" />
            <span>Уровень топлива в баке при приеме:</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(["0", "1/4", "1/2", "3/4", "1/1"] as const).map((lvl) => {
              const isSelected = current.fuelLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={readOnly}
                  onClick={() => updateState({ fuelLevel: lvl })}
                  className={`py-1.5 rounded-lg border font-bold text-xs transition-all ${
                    isSelected
                      ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                      : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100"
                  }`}
                >
                  {lvl === "0" ? "Пусто (0)" : lvl === "1/1" ? "Полный (1/1)" : lvl}
                </button>
              );
            })}
          </div>

          {/* Cleanliness / Dirty status */}
          <div className="mt-4">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={current.isDirty}
                onChange={(e) => updateState({ isDirty: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded border-slate-300 dark:border-zinc-700 focus:ring-red-500"
              />
              <span className="flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Автомобиль принят в грязном виде (возможны скрытые повреждения ЛКП)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Equipment Checklist */}
        <div>
          <div className="font-bold text-slate-800 dark:text-zinc-200 mb-2">
            Комплектность ТС (наличие в автомобиле):
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "sts", label: "СТС (свидетельство)" },
              { key: "spareWheel", label: "Запасное колесо" },
              { key: "jack", label: "Домкрат и инструмент" },
              { key: "warningTriangle", label: "Знак авар. остановки" },
              { key: "firstAidKit", label: "Аптечка" },
              { key: "dashcam", label: "Видеорегистратор" },
            ].map((item) => {
              const checked = !!(current.equipment as any)[item.key];
              return (
                <label
                  key={item.key}
                  className="flex items-center space-x-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={checked}
                    onChange={(e) =>
                      updateState({
                        equipment: {
                          ...current.equipment,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-red-600 rounded border-slate-300 dark:border-zinc-700 focus:ring-red-500"
                  />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
