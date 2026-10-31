"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
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
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "UNDER_REVIEW":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "SUSPENDED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const getStatusLabel = (status: SubsoilLicense["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "Действует";
      case "UNDER_REVIEW":
        return "На пересмотре";
      case "SUSPENDED":
        return "Приостановлена";
      default:
        return status;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f18]">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#0e1522]">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">
            Реестр лицензий
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Учет действующих лицензий на право пользования недрами
          </p>
        </div>

        <button
          onClick={() => alert("Форма внесения новой лицензии...")}
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950 transition-colors flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить лицензию</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 bg-[#0b111c] border-b border-zinc-800/80 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру, участку или предприятию..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0e1522] border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/60"
          />
        </div>

        <div className="flex items-center space-x-1 text-xs">
          {["ALL", "ACTIVE", "UNDER_REVIEW", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                statusFilter === st
                  ? "bg-zinc-800 text-sky-300 font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {st === "ALL" ? "Все" : getStatusLabel(st as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((lic) => (
            <div
              key={lic.id}
              className="p-5 rounded-xl bg-[#0e1522] border border-zinc-800 space-y-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-sky-400">
                      {lic.code}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded border ${getStatusBadge(
                        lic.status
                      )}`}
                    >
                      {getStatusLabel(lic.status)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {lic.subsoil_plot}
                  </h3>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Недропользователь:</span>
                  <span className="font-medium text-zinc-200 text-right">{lic.holder}</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Ископаемое:</span>
                  <span className="text-zinc-300 text-right">{lic.mineral_type}</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Регион:</span>
                  <span className="text-zinc-400 text-right">{lic.region}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                <span>Срок: {lic.issue_date} – {lic.expiry_date}</span>
                <span>{lic.curator}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
