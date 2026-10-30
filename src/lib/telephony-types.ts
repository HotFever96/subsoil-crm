"use client";

export type CallType = "csi_quality" | "readiness_reminder" | "inbound_admin";
export type CallStatus = "completed" | "in_progress" | "no_answer" | "scheduled";

export interface TelephonyCallRecord {
  id: string;
  type: CallType;
  clientName: string;
  clientPhone: string;
  vehicleInfo: string;
  orderNumber?: string;
  date: string;
  time: string;
  durationSeconds: number;
  status: CallStatus;
  rating?: number; // 1 to 5 stars
  hasComplaints?: boolean;
  transcript: string;
  aiSummary: string;
  costRub: number;
}
