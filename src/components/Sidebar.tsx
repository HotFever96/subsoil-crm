"use client";

import React from "react";
import {
  Mail,
  Scale,
  FolderGit2,
  Database,
  Layers,
  ChevronRight,
  User,
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
      icon: Mail,
      badge: pendingMailsCount > 0 ? `${pendingMailsCount}` : undefined,
    },
    {
      id: "legal-expert" as NavTab,
      label: "Правовой консультант",
      icon: Scale,
    },
    {
      id: "project-studio" as NavTab,
      label: "Проектирование",
      icon: FolderGit2,
    },
    {
      id: "licenses" as NavTab,
      label: "Реестр лицензий",
      icon: Database,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0a0f18] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-100 tracking-tight">
              GEONEDRA
            </div>
            <div className="text-[11px] text-slate-500">
              Система недропользования
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Разделы
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  isActive
                    ? "bg-slate-800/80 text-amber-300 font-medium border border-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300 border border-slate-700">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">
              Константин Орлов
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Юридический отдел
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
