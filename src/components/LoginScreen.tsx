"use client";

import React, { useState } from "react";
import { ArrowRight, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = login(username, password);
    if (!success) {
      setError("Неверное имя пользователя или пароль");
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0c1015] px-4 transition-colors relative bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(14,165,233,0.1),transparent_70%)]">
      <div className="w-full max-w-sm bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-xl shadow-sky-950/5 dark:shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src={theme === "dark" ? "/geo-ai-logo-dark.png" : "/geo-ai-logo-light.png"}
              alt="Geo AI"
              className="h-9 w-auto max-w-[200px] object-contain transition-all"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Вход в корпоративную систему недропользования
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Имя пользователя
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Логин"
                autoComplete="username"
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Пароль
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                autoComplete="current-password"
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <span>Войти</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
