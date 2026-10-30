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
  Check,
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
  isPrint?: boolean;
}

const DEFAULT_INSPECTION: VehicleInspectionData = {
  vehicleBodyType: "car",
  fuelLevel: "1/2",
  equipment: {
    sts: true,
    keysCount: 1,
    spareWheel: true,
    jack: true,
    firstAidKit: true,
    warningTriangle: true,
    dashcam: false,
  },
  isDirty: false,
  damages: [],
};

const DAMAGE_META: Record<DamageType, { label: "Ц" | "В" | "С" | "К"; title: string; color: string; bg: string }> = {
  scratch: { label: "Ц", title: "Царапина (Ц)", color: "text-amber-500", bg: "bg-amber-500" },
  dent: { label: "В", title: "Вмятина (В)", color: "text-blue-500", bg: "bg-blue-500" },
  chip: { label: "С", title: "Скол (С)", color: "text-rose-500", bg: "bg-rose-500" },
  rust: { label: "К", title: "Коррозия (К)", color: "text-orange-500", bg: "bg-orange-500" },
};

const VIEW_TITLES: Record<string, string> = {
  top: "1. Вид сверху",
  side_left: "2. Левый борт",
  side_right: "3. Правый борт",
  front: "4. Спереди",
  rear: "5. Сзади",
};

export const VehicleInspectionSchematic: React.FC<VehicleInspectionSchematicProps> = ({
  inspection = DEFAULT_INSPECTION,
  onChange,
  readOnly = false,
  isPrint = false,
}) => {
  const current = inspection || DEFAULT_INSPECTION;
  const isCar = current.vehicleBodyType === "car";

  const [selectedDamageType, setSelectedDamageType] = useState<DamageType>("scratch");
  const [damageNote, setDamageNote] = useState("");

  const updateState = (updated: Partial<VehicleInspectionData>) => {
    if (readOnly || !onChange) return;
    onChange({
      ...current,
      ...updated,
    });
  };

  const handleImageClick = (
    view: "top" | "side_left" | "side_right" | "front" | "rear",
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (readOnly || !onChange || isPrint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newMarker: DamagePoint = {
      id: `dmg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: selectedDamageType,
      label: DAMAGE_META[selectedDamageType].label,
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
    if (readOnly || !onChange || isPrint) return;
    updateState({
      damages: (current.damages || []).filter((d) => d.id !== id),
    });
  };

  const getVehicleImageSrc = (view: "top" | "side_left" | "side_right" | "front" | "rear") => {
    const prefix = isCar ? "car" : "van";
    switch (view) {
      case "top":
        return `/vehicles/${prefix}_top.png`;
      case "side_left":
        return `/vehicles/${prefix}_left.png`;
      case "side_right":
        return `/vehicles/${prefix}_right.png`;
      case "front":
        return `/vehicles/${prefix}_front.png`;
      case "rear":
        return `/vehicles/${prefix}_rear.png`;
    }
  };

  // -------------------------------------------------------------
  // PRINT VERSION (A4 Sheet strictly pure white background & crisp)
  // -------------------------------------------------------------
  if (isPrint) {
    const viewsList: Array<"top" | "side_left" | "side_right" | "front" | "rear"> = [
      "top",
      "side_left",
      "side_right",
      "front",
      "rear",
    ];

    return (
      <div className="bg-white text-black font-sans text-[11px] leading-tight space-y-3">
        {/* Title & Body type indicator */}
        <div className="flex items-center justify-between border-b border-black pb-1">
          <span className="font-bold text-xs uppercase tracking-wider">
            СХЕМА ОСМОТРА ТС И КАРТА ПОВРЕЖДЕНИЙ КУЗОВА ({isCar ? "Легковой автомобиль" : "Грузовой / Коммерческий"})
          </span>
          <span className="text-[10px] text-gray-700">
            Обозначения: <strong>Ц</strong> — Царапина, <strong>В</strong> — Вмятина, <strong>С</strong> — Скол, <strong>К</strong> — Коррозия
          </span>
        </div>

        {/* 5 Views Grid (Pure white line art + plotted damage pins) */}
        <div className="grid grid-cols-5 gap-2">
          {viewsList.map((viewKey) => {
            const viewDamages = (current.damages || []).filter((d) => d.view === viewKey);
            const imgSrc = getVehicleImageSrc(viewKey);

            return (
              <div key={viewKey} className="border border-gray-400 p-1 flex flex-col justify-between bg-white">
                <div className="text-[10px] font-bold text-center text-gray-800 mb-0.5">
                  {VIEW_TITLES[viewKey]}
                </div>

                <div className="relative w-full aspect-4/3 bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={VIEW_TITLES[viewKey]}
                    className="w-full h-full object-contain pointer-events-none select-none"
                  />
                  {viewDamages.map((d) => {
                    const meta = DAMAGE_META[d.type];
                    return (
                      <div
                        key={d.id}
                        style={{ left: `${d.x}%`, top: `${d.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${meta.bg} text-white font-black text-[9px] flex items-center justify-center ring-1 ring-black shadow-xs z-10`}
                      >
                        {d.label}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] text-center text-gray-600 mt-0.5">
                  {viewDamages.length > 0 ? `Дефектов: ${viewDamages.length}` : "Без дефектов"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Defects Details Table & Condition Summary */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Left: Defects decoded list */}
          <div className="border border-gray-400 p-2 space-y-1">
            <span className="font-bold text-[10px] uppercase tracking-wide block border-b border-gray-300 pb-1">
              Перечень зафиксированных дефектов кузова:
            </span>
            {(current.damages || []).length === 0 ? (
              <p className="text-gray-600 italic py-2 text-center text-[10px]">
                Видимых механических повреждений кузова, стекол и оптики не зафиксировано
              </p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-hidden">
                {current.damages.map((d, idx) => (
                  <div key={d.id} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center space-x-1">
                      <strong className="w-3.5 h-3.5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[9px]">
                        {d.label}
                      </strong>
                      <span>
                        {idx + 1}. {DAMAGE_META[d.type].title} — {VIEW_TITLES[d.view]}
                      </span>
                    </span>
                    <span className="text-gray-600 text-[9px] italic">
                      {d.note || `Коорд: ${d.x}%, ${d.y}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Fuel Level & Completeness Checklist */}
          <div className="border border-gray-400 p-2 space-y-2">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span>УРОВЕНЬ ТОПЛИВА В БАКЕ:</span>
                <span className="font-extrabold text-black">
                  {current.fuelLevel === "0" ? "0 (Пусто)" : current.fuelLevel === "1/1" ? "1/1 (Полный)" : current.fuelLevel}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 mt-1 text-[9px] text-center">
                {(["0", "1/4", "1/2", "3/4", "1/1"] as const).map((lvl) => (
                  <div
                    key={lvl}
                    className={`py-0.5 border ${
                      current.fuelLevel === lvl ? "bg-black text-white font-bold border-black" : "border-gray-400 text-gray-700"
                    }`}
                  >
                    {lvl}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-300 pt-1.5">
              <span className="font-bold text-[10px] block mb-1">КОМПЛЕКТНОСТЬ ТРАНСПОРТНОГО СРЕДСТВА:</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                <div>СТС: <strong>{current.equipment?.sts ? "Да" : "Нет"}</strong></div>
                <div>Ключи: <strong>{current.equipment?.keysCount || 1} шт.</strong></div>
                <div>Запасное колесо: <strong>{current.equipment?.spareWheel ? "Да" : "Нет"}</strong></div>
                <div>Домкрат / инструмент: <strong>{current.equipment?.jack ? "Да" : "Нет"}</strong></div>
                <div>Знак авар. остановки: <strong>{current.equipment?.warningTriangle ? "Да" : "Нет"}</strong></div>
                <div>Аптечка / огнетушитель: <strong>{current.equipment?.firstAidKit ? "Да" : "Нет"}</strong></div>
              </div>
            </div>

            {current.isDirty && (
              <div className="border border-black p-1 text-[9px] font-bold text-center bg-gray-100">
                ⚠ ТС принято в грязном виде (возможны скрытые дефекты ЛКП после мойки)
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // INTERACTIVE SCREEN VERSION (Inside Repair Order modal tab)
  // -------------------------------------------------------------
  const viewsList: Array<{ key: "top" | "side_left" | "side_right" | "front" | "rear"; title: string }> = [
    { key: "top", title: "1. Вид сверху" },
    { key: "side_left", title: "2. Левый борт" },
    { key: "side_right", title: "3. Правый борт" },
    { key: "front", title: "4. Спереди" },
    { key: "rear", title: "5. Сзади" },
  ];

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Top Toolbar: Vehicle Body Type & Damage Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.07] backdrop-blur-xl">
        {/* Body Type Selector */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-zinc-300">Тип кузова:</span>
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => updateState({ vehicleBodyType: "car" })}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isCar
                  ? "bg-red-600 text-white font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Легковой</span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => updateState({ vehicleBodyType: "van_truck" })}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isCar
                  ? "bg-red-600 text-white font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
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
            <span className="font-semibold text-zinc-300 mr-1">Дефект:</span>
            {(["scratch", "dent", "chip", "rust"] as DamageType[]).map((t) => {
              const meta = DAMAGE_META[t];
              const isSelected = selectedDamageType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedDamageType(t)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-950 border-white/[0.08] text-zinc-300 hover:border-white/[0.2]"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${meta.bg} text-white flex items-center justify-center text-[10px] font-black`}>
                    {meta.label}
                  </span>
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5 Technical Blueprint Drawings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {viewsList.map(({ key: viewKey, title }) => {
          const viewDamages = (current.damages || []).filter((d) => d.view === viewKey);
          const imgSrc = getVehicleImageSrc(viewKey);

          return (
            <div
              key={viewKey}
              className="p-3 rounded-2xl bg-zinc-900/50 border border-white/[0.07] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-zinc-200 text-[11px] uppercase tracking-wider truncate">
                  {title}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {viewDamages.length > 0 ? `${viewDamages.length} деф.` : "0 деф."}
                </span>
              </div>

              {/* Technical Drawing Canvas with clickable damage coordinates */}
              <div
                onClick={(e) => handleImageClick(viewKey, e)}
                className="relative w-full aspect-16/10 bg-white rounded-xl border border-white/[0.1] overflow-hidden cursor-crosshair flex items-center justify-center shadow-inner group"
                title="Кликните в любое место чертежа для нанесения маркера дефекта"
              >
                <img
                  src={imgSrc}
                  alt={title}
                  className="w-full h-full object-contain pointer-events-none select-none p-1"
                />

                {/* Overlaid Damage Badges */}
                {viewDamages.map((d) => {
                  const meta = DAMAGE_META[d.type];
                  return (
                    <div
                      key={d.id}
                      style={{ left: `${d.x}%`, top: `${d.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!readOnly) removeDamage(d.id);
                      }}
                      title={d.note || `${meta.title} (${d.x}%, ${d.y}%) — нажмите для удаления`}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${meta.bg} text-white font-black text-[11px] flex items-center justify-center shadow-lg ring-2 ring-white cursor-pointer hover:scale-125 transition-transform z-10 animate-in zoom-in-50 duration-150`}
                    >
                      {d.label}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 6th Card: Damage Summary and Notes */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/[0.07] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-zinc-200 text-[11px] uppercase tracking-wider">
                Сводка повреждений ({current.damages?.length || 0})
              </span>
              {(current.damages?.length || 0) > 0 && !readOnly && (
                <button
                  type="button"
                  onClick={() => updateState({ damages: [] })}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                >
                  Очистить все
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-1">
              {(current.damages || []).length === 0 ? (
                <div className="text-center py-6 text-zinc-500">
                  <Info className="w-5 h-5 mx-auto mb-1 opacity-40" />
                  <span className="text-[11px]">Кликните на чертеж для фиксации дефекта</span>
                </div>
              ) : (
                current.damages.map((d, idx) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950 border border-white/[0.06] text-[11px]"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className={`w-3.5 h-3.5 rounded-full ${DAMAGE_META[d.type].bg} text-white font-bold text-[9px] flex items-center justify-center shrink-0`}>
                        {d.label}
                      </span>
                      <span className="text-zinc-200 truncate">
                        {idx + 1}. {DAMAGE_META[d.type].title} ({d.view})
                      </span>
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeDamage(d.id)}
                        className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer shrink-0"
                        title="Удалить метку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] text-[10px] text-zinc-400">
            Обозначения: <strong className="text-amber-400">Ц</strong> — Царапина, <strong className="text-blue-400">В</strong> — Вмятина, <strong className="text-rose-400">С</strong> — Скол, <strong className="text-orange-400">К</strong> — Коррозия
          </div>
        </div>
      </div>

      {/* Fuel Level Scale & Equipment Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.07]">
        {/* Fuel Level Scale */}
        <div className="space-y-3">
          <label className="font-bold text-zinc-200 flex items-center space-x-2">
            <Fuel className="w-4 h-4 text-amber-500" />
            <span>Уровень топлива в баке при приеме ТС:</span>
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
                  className={`py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500 text-white border-amber-500 shadow-md scale-105"
                      : "bg-zinc-950 border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.2]"
                  }`}
                >
                  {lvl === "0" ? "Пусто" : lvl === "1/1" ? "Полный" : lvl}
                </button>
              );
            })}
          </div>

          {/* Cleanliness / Dirty status checkbox */}
          <div className="pt-2">
            <label className="flex items-center space-x-2.5 text-xs font-semibold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={current.isDirty}
                onChange={(e) => updateState({ isDirty: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span className="flex items-center space-x-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Автомобиль принят в грязном виде (возможны скрытые повреждения ЛКП после мойки)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Equipment Completeness Checklist */}
        <div className="space-y-2">
          <div className="font-bold text-zinc-200 flex items-center space-x-1.5">
            <CheckSquare className="w-4 h-4 text-red-500" />
            <span>Комплектность автомобиля при передаче:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { key: "sts", label: "СТС (свидетельство)" },
              { key: "spareWheel", label: "Запасное колесо" },
              { key: "jack", label: "Домкрат и балонник" },
              { key: "warningTriangle", label: "Знак авар. остановки" },
              { key: "firstAidKit", label: "Аптечка / огнетушитель" },
              { key: "dashcam", label: "Видеорегистратор" },
            ].map((item) => {
              const checked = Boolean((current.equipment as any)[item.key]);
              return (
                <label
                  key={item.key}
                  className="flex items-center space-x-2 text-zinc-300 cursor-pointer p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
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
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-500 cursor-pointer"
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
