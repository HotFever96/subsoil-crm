import { MailboxAccount } from "./supabase";

export interface MailboxPreset {
  id: string;
  title: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  hint: string;
}

export const MAILBOX_PRESETS: MailboxPreset[] = [
  {
    id: "yandex",
    title: "Яндекс 360 / Mail",
    imap_host: "imap.yandex.ru",
    imap_port: 993,
    imap_secure: true,
    smtp_host: "smtp.yandex.ru",
    smtp_port: 465,
    smtp_secure: true,
    hint: "Требуется пароль приложения в Яндекс ID (Безопасность -> Пароли приложений)",
  },
  {
    id: "mailru",
    title: "Mail.ru / VK",
    imap_host: "imap.mail.ru",
    imap_port: 993,
    imap_secure: true,
    smtp_host: "smtp.mail.ru",
    smtp_port: 465,
    smtp_secure: true,
    hint: "Используйте специальный пароль для внешних приложений в настройках Mail.ru",
  },
  {
    id: "vkwork",
    title: "VK WorkMail (Корп.)",
    imap_host: "imap.biz.mail.ru",
    imap_port: 993,
    imap_secure: true,
    smtp_host: "smtp.biz.mail.ru",
    smtp_port: 465,
    smtp_secure: true,
    hint: "Корпоративная почта на домене компании",
  },
  {
    id: "gmail",
    title: "Google Workspace / Gmail",
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_secure: true,
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_secure: true,
    hint: "Требуется 2FA и создание Пароля приложения в Google аккаунте",
  },
  {
    id: "custom",
    title: "Свой сервер (Custom)",
    imap_host: "mail.company.ru",
    imap_port: 993,
    imap_secure: true,
    smtp_host: "mail.company.ru",
    smtp_port: 465,
    smtp_secure: true,
    hint: "Укажите индивидуальные хосты и порты вашего корпоративного почтового сервера",
  },
];

export const BADGE_COLORS = [
  { id: "sky", label: "Синий", border: "border-sky-500/30", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  { id: "emerald", label: "Изумрудный", border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  { id: "amber", label: "Янтарный", border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  { id: "violet", label: "Фиолетовый", border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  { id: "rose", label: "Розовый", border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  { id: "teal", label: "Бирюзовый", border: "border-teal-500/30", bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
];

export function getMailboxBadgeStyle(color?: string) {
  const found = BADGE_COLORS.find((c) => c.id === color) || BADGE_COLORS[0];
  return `${found.bg} ${found.text} ${found.border}`;
}

export function getMailboxDotColor(color?: string) {
  const found = BADGE_COLORS.find((c) => c.id === color) || BADGE_COLORS[0];
  return found.dot;
}
