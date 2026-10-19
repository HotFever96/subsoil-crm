import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "placeholder-anon-key";

// Client for public / browser context
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SubsoilLicense {
  id: string;
  code: string; // e.g. "КРР 01842 ТЭ"
  subsoil_plot: string; // "Усть-Балыкское месторождение"
  mineral_type: string; // "Углеводородное сырье / Нефть"
  status: "ACTIVE" | "EXPIRED" | "UNDER_REVIEW" | "SUSPENDED";
  holder: string; // "ООО «СеверНефтеГазРазведка»"
  region: string;
  issue_date: string;
  expiry_date: string;
  curator: string;
}

export interface MailboxAccount {
  id: string;
  name: string; // Метка ящика: "Карьер-1", "Минприроды", "Официальная почта"
  email: string; // "career1@company.ru"
  imap_host: string; // "imap.yandex.ru"
  imap_port: number; // 993
  imap_secure: boolean; // true
  smtp_host: string; // "smtp.yandex.ru"
  smtp_port: number; // 465
  smtp_secure: boolean; // true
  password?: string; // Пароль приложения
  badge_color?: "sky" | "emerald" | "amber" | "violet" | "rose" | "teal" | string;
  created_at?: string;
}

export interface MailItem {
  id: string;
  folder?: "INBOX" | "SENT" | "DRAFTS";
  mailbox_id?: string; // Связанный ящик (ID)
  mailbox_name?: string; // Метка ящика ("Карьер-1", "Минприроды")
  incoming_number: string;
  date: string;
  agency: string; // e.g., "Роснедра", "Росприроднадзор", "Центрнедра"
  department: string;
  subject: string;
  urgency: "HIGH" | "CRITICAL" | "STANDARD";
  deadline?: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "EDITED" | "SENT";
  incoming_content: string;
  license_id?: string;
  license_code?: string;
  sender_email?: string;
  recipient_email?: string;
  ai_draft?: {
    title: string;
    legal_basis: string[];
    reply_body: string;
    confidence_score: number;
    recommended_action: string;
  };
  sent_body?: string;
  recipient?: string;
}

export interface UserNote {
  id: string;
  title: string;
  content: string;
  category?: "contacts" | "tasks" | "general" | "equipment" | "legal" | string;
  created_at?: string;
  tags?: string[];
}

export interface ChatActionPayload {
  type:
    | "CALENDAR_CREATED"
    | "CALENDAR_UPDATED"
    | "CALENDAR_DELETED"
    | "MAIL_DRAFT_CREATED"
    | "NOTE_SAVED"
    | "PROJECT_SECTION_UPDATED"
    | "REPAIR_ORDER_CREATED";
  title?: string;
  date?: string;
  time?: string;
  tag?: string;
  priority?: string;
  agency?: string;
  subject?: string;
  sectionCode?: string;
  sectionTitle?: string;
  content?: string;
  description?: string;
  details?: string | Record<string, any>;
  data?: any;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  actions?: ChatActionPayload[];
  citations?: {
    law_article: string;
    title: string;
    excerpt?: string;
  }[];
  attachments?: {
    name: string;
    type: "image" | "pdf" | "excel" | "word" | "text" | string;
    previewUrl?: string;
  }[];
}

export interface ProjectStudioDraft {
  id: string;
  title: string;
  type: "MINING_PLAN" | "GEOLOGICAL_STUDY" | "TECH_PROJECT" | "ENV_ASSESSMENT";
  license_code: string;
  deposit_name: string;
  step: number;
  total_steps: number;
  parameters: {
    exploration_depth_m?: number;
    expected_reserves_c1?: string;
    expected_reserves_c2?: string;
    production_quota_annual?: string;
    industrial_safety_class?: string;
    environmental_zone?: string;
    contractor?: string;
  };
  generated_sections?: {
    section_id: string;
    title: string;
    content: string;
    status: "ready" | "in_review" | "generating";
  }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  description?: string;
  tag: "Проверка" | "Дедлайн" | "Встреча" | "Отчет";
  priority: "CRITICAL" | "HIGH" | "NORMAL";
  license_code?: string;
}
