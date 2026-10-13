import { MailItem, SubsoilLicense, CalendarEvent, ChatMessage } from "@/lib/supabase";

export const INITIAL_LICENSES: SubsoilLicense[] = [];

export const ADMIN_CALENDAR_EVENTS: CalendarEvent[] = [];

export const ANTONV_CALENDAR_EVENTS: CalendarEvent[] = [];

export const INITIAL_MAILS: MailItem[] = [];

export const ADMIN_INITIAL_MAILS: MailItem[] = [];

export const ANTONV_INITIAL_MAILS: MailItem[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const getUserInitialEvents = (_username: string): CalendarEvent[] => {
  return [];
};

export const getUserInitialMails = (_username: string): MailItem[] => {
  return [];
};

export const getUserWelcomeMsg = (username: string, name?: string): ChatMessage => {
  return {
    id: `welcome-${username || "guest"}`,
    role: "assistant",
    content: `Здравствуйте, ${name || "пользователь"}! Я интеллектуальный помощник системы **Geo AI**.\n\nГотов помочь вам с:\n- Анализом и обработкой любых документов (PDF, Excel, Word);\n- Подготовкой проектов и официальных писем;\n- Расчетами показателей и юридической экспертизой;\n- Написанием кода, аналитикой и ответами на любые вопросы.`,
    created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};
