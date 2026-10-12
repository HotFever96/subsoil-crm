"use client";

import React from "react";
import {
  Mail,
  Scale,
  FolderGit2,
  FileCheck2,
  Database,
  ShieldCheck,
  Building2,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export type NavTab = "smart-mail" | "legal-expert" | "project-studio" | "licenses";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingMailsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingMailsCount = 2,
}) => {
  const navItems = [
    {
      id: "smart-mail" as NavTab,
      label: "Деловая переписка",
      subtitle: "Smart Mail • Human-in-the-loop",
      icon: Mail,
      badge: pendingMailsCount > 0 ? `${pendingMailsCount} вх.` : undefined,
      badgeColor: "bg-amber-900/60 text-amber-300 border-amber-700/50",
    },
    {
      id: "legal-expert" as NavTab,
      label: "Правовой консалтинг",
      subtitle: "AI Legal Expert • Право РФ",
      icon: Scale,
    },
    {
      id: "project-studio" as NavTab,
      label: "Генерация проектов",
      subtitle: "Project Studio • ЦКР / ТЭО / ПРГР",
      icon: FolderGit2,
    },
    {
      id: "licenses" as NavTab,
      label: "Реестр лицензий",
      subtitle: "Государственный фонд недр",
      icon: Database,
    },
  ];

  return (
    <aside className="w-80 border-r border-[#b8860b]/20 bg-[#0a1019]/90 backdrop-blur-md flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#b8860b]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#b8860b] to-[#161e2c] p-[1px] shadow-lg shadow-[#b8860b]/10">
              <div className="w-full h-full bg-[#111620] rounded-[7px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#b8860b]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold tracking-wider text-sm text-slate-100">
                  GEONEDRA
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#b8860b]/15 text-[#b8860b] border border-[#b8860b]/30">
                  CORP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight">
                Subsoil Governance OS
              </p>
            </div>
          </div>
        </div>

        {/* System Status Banner */}
        <div className="mx-4 my-4 p-3 rounded-lg bg-[#111620]/80 border border-[#b8860b]/20 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">Контур безопасности</span>
          </div>
          <span className="text-[10px] font-mono text-[#b8860b] uppercase tracking-wider">
            ГОСТ Р 57580
          </span>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-2 space-y-1">
          <p className="px-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium mb-2">
            Модули управления
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full group text-left px-3.5 py-3 rounded-xl transition-all duration-200 flex items-center justify-between border ${
                  isActive
                    ? "bg-[#161e2c] text-amber-200 border-[#b8860b]/40 shadow-sm shadow-[#b8860b]/10"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111620]/60 hover:border-[#b8860b]/15"
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#b8860b]/20 text-[#b8860b]"
                        : "bg-slate-800/40 text-slate-400 group-hover:text-amber-400/80 group-hover:bg-[#111620]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium tracking-tight flex items-center space-x-2">
                      <span className={isActive ? "text-slate-100 font-semibold" : "text-slate-300"}>
                        {item.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 group-hover:text-slate-400 font-normal">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-mono font-medium ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-[#b8860b]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Security */}
      <div className="p-4 border-t border-[#b8860b]/15 bg-[#0a1019]">
        <div className="p-3 rounded-xl bg-[#111620]/60 border border-[#b8860b]/15 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#161e2c] to-[#b8860b]/40 flex items-center justify-center text-xs font-serif font-bold text-amber-200 border border-[#b8860b]/30">
            ЮР
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              Константин В. Орлов
            </p>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              Директор правового департамента
            </p>
          </div>
          <ShieldCheck className="w-4 h-4 text-[#b8860b] shrink-0" />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Supabase Cloud Sync</span>
          <span className="flex items-center space-x-1 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8860b]" />
            <span>OpenRouter v1.4</span>
          </span>
        </div>
      </div>
    </aside>
  );
};
