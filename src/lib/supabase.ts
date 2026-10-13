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

export interface MailItem {
  id: string;
  folder?: "INBOX" | "SENT" | "DRAFTS";
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
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
