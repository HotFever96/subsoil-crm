"use client";

import React, { useState } from "react";
import {
  Database,
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
  Calendar,
  MapPin,
  User,
  Layers,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { SubsoilLicense } from "@/lib/supabase";
import { INITIAL_LICENSES } from "@/lib/mock-data";

export const LicenseRegistry: React.FC = () => {
  const [licenses, setLicenses] = useState<SubsoilLicense[]>(INITIAL_LICENSES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = licenses.filter((lic) => {
    const matchesSearch =
      lic.code.toLowerCase().includes(search.toLowerCase()) ||
      lic.subsoil_plot.toLowerCase().includes(search.toLowerCase()) ||
      lic.holder.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || lic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: SubsoilLicense["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-950/70 text-emerald-400 border-emerald-700/50";
      case "UNDER_REVIEW":
        return "bg-amber-950/70 text-amber-400 border-amber-700/50";
      case "SUSPENDED":
        return "bg-rose-950/70 text-rose-400 border-rose-700/50";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getStatusLabel = (status: SubsoilLicense["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "ДЕЙСТВУЕТ";
      case "UNDER_REVIEW":
        return "ПЕРЕСМОТР УСЛОВИЙ";
      case "SUSPENDED":
        return "ПРИОСТАНОВЛЕНА";
      default:
        return status;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0a1019] via-[#0d1421] to-[#111620]">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-[#b8860b]/15 flex items-center justify-between bg-[#0a1019]/70 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-[#161e2c] border border-[#b8860b]/30 flex items-center justify-center text-[#b8860b] shadow-md shadow-[#b8860b]/10">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                Реестр лицензий на недропользование
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-700/30">
                Синхронизировано с ФГИС «АСЛН»
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Учет лицензионных обязательств, сроков геологического изучения и добычных участков
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert("Инициализация формы внесения новой лицензии в реестр...")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#b8860b] to-[#996515] text-slate-950 hover:from-[#d4af37] hover:to-[#b8860b] transition-all shadow-lg shadow-[#b8860b]/20"
          >
            + Добавить лицензию
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-8 py-4 bg-[#0d1421]/60 border-b border-[#b8860b]/15 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по серии, номеру, участку или недропользователю..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#111620] border border-[#b8860b]/25 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#b8860b]"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Статус:</span>
          {["ALL", "ACTIVE", "UNDER_REVIEW", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all ${
                statusFilter === st
                  ? "bg-[#1c2738] text-amber-200 border border-[#b8860b]/40 shadow"
                  : "text-slate-400 hover:text-slate-200 bg-[#111620]/50"
              }`}
            >
              {st === "ALL" ? "Все" : getStatusLabel(st as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Table / Cards */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((lic) => (
            <div
              key={lic.id}
              className="p-6 rounded-2xl bg-[#0f1622] border border-[#b8860b]/25 shadow-xl hover:border-[#b8860b]/50 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono text-sm font-bold text-[#b8860b]">
                      {lic.code}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusBadge(
                        lic.status
                      )}`}
                    >
                      {getStatusLabel(lic.status)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {lic.subsoil_plot}
                  </h3>
                </div>
                <div className="p-2 rounded-xl bg-[#161e2c] border border-[#b8860b]/20 text-[#b8860b]">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0a1019] border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 font-mono">Недропользователь:</span>
                  <span className="font-semibold text-slate-200 text-right">{lic.holder}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 font-mono">Вид ископаемого:</span>
                  <span className="text-amber-200 text-right">{lic.mineral_type}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 font-mono">Субъект РФ:</span>
                  <span className="text-slate-300 text-right">{lic.region}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#b8860b]/15 text-xs font-mono text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#b8860b]" />
                  <span>Срок действия: {lic.issue_date} – {lic.expiry_date}</span>
                </div>
                <div className="flex items-center space-x-1 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  <span>{lic.curator}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
