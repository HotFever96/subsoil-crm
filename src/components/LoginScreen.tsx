"use client";

import React, { useState } from "react";
import { Layers, ArrowRight, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = login(username, password);
    if (!success) {
      setError("Неверный логин или пароль. Попробуйте admin / admin или antonv / 123");
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#12161c] px-4 transition-colors">
      <div className="w-full max-w-sm bg-white dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              GEONEDRA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Вход в корпоративную систему
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Логин
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin или antonv"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
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
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
          >
            <span>Войти</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo hints */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-center text-[11px] text-slate-400 space-y-1">
          <div>Аккаунты для входа:</div>
          <div className="flex justify-center space-x-3 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => {
                setUsername("admin");
                setPassword("admin");
              }}
              className="hover:text-amber-500 transition-colors"
            >
              admin / admin
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setUsername("antonv");
                setPassword("123");
              }}
              className="hover:text-amber-500 transition-colors"
            >
              antonv / 123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
