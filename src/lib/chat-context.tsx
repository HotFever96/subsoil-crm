"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/supabase";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: number;
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession;
  createNewChat: () => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setSessionMessages: (sessionId: string, messages: ChatMessage[], newTitle?: string) => void;
  clearAllChats: () => void;
  isSyncing: boolean;
}

const STORAGE_SESSIONS_KEY = "geo_ai_chat_sessions_v3";
const STORAGE_ACTIVE_ID_KEY = "geo_ai_active_session_id_v3";

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: "welcome-1",
  role: "assistant",
  content: "Здравствуйте! Чем я могу помочь сегодня? Могу проанализировать документы, написать или оптимизировать код, составить прогноз, подготовить проект или ответить на любые вопросы.",
  created_at: "10:00",
};

const STATIC_DEFAULT_SESSION: ChatSession = {
  id: "session-default",
  title: "Новый чат",
  createdAt: "Сегодня",
  updatedAt: 0,
  messages: [DEFAULT_WELCOME_MSG],
};

const createNewSessionInstance = (): ChatSession => ({
  id: `session-${Date.now()}`,
  title: "Новый чат",
  createdAt: "Сегодня",
  updatedAt: Date.now(),
  messages: [DEFAULT_WELCOME_MSG],
});

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([STATIC_DEFAULT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-default");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedMsgIds = useRef<Set<string>>(new Set());

  // 1. Initial Load: LocalStorage immediately + Supabase async
  useEffect(() => {
    let currentSessions: ChatSession[] = [];
    try {
      const savedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
      const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);

      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentSessions = parsed;
          setSessions(parsed);
          const validActive = parsed.find((s: ChatSession) => s.id === savedActiveId);
          setActiveSessionId(validActive ? validActive.id : parsed[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved chat sessions from localStorage:", e);
    }

    if (currentSessions.length === 0) {
      const initial = createNewSessionInstance();
      currentSessions = [initial];
      setSessions([initial]);
      setActiveSessionId(initial.id);
    }
    setIsInitialized(true);

    // Track already known message IDs
    currentSessions.forEach((s) => {
      s.messages.forEach((m) => syncedMsgIds.current.add(m.id));
    });

    // Fetch cloud messages from Supabase
    const fetchFromSupabase = async () => {
      try {
        setIsSyncing(true);
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_chats" }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.rows) && data.rows.length > 0) {
          // Group Supabase rows by session_id
          const sessionMap = new Map<string, { title: string; messages: ChatMessage[] }>();

          data.rows.forEach((row: any) => {
            const sessId = row.citations?.session_id || "session-cloud";
            const sessTitle = row.citations?.session_title || "Диалог с ИИ";
            const msg: ChatMessage = {
              id: row.id,
              role: row.role,
              content: row.content,
              created_at: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              attachments: row.citations?.attachments,
            };
            syncedMsgIds.current.add(row.id);

            if (!sessionMap.has(sessId)) {
              sessionMap.set(sessId, { title: sessTitle, messages: [DEFAULT_WELCOME_MSG] });
            }
            sessionMap.get(sessId)!.messages.push(msg);
          });

          // Merge cloud sessions with local sessions
          setSessions((prev) => {
            const merged = [...prev];
            sessionMap.forEach((val, sessId) => {
              const existingIdx = merged.findIndex((s) => s.id === sessId);
              if (existingIdx >= 0) {
                // Ensure messages from cloud are included
                const existingMsgIds = new Set(merged[existingIdx].messages.map((m) => m.id));
                const newMsgs = val.messages.filter((m) => !existingMsgIds.has(m.id));
                if (newMsgs.length > 0) {
                  merged[existingIdx] = {
                    ...merged[existingIdx],
                    messages: [...merged[existingIdx].messages, ...newMsgs],
                  };
                }
              } else {
                merged.unshift({
                  id: sessId,
                  title: val.title,
                  createdAt: "В облаке",
                  updatedAt: Date.now(),
                  messages: val.messages,
                });
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn("Supabase chat fetch error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchFromSupabase();
  }, []);

  // 2. Persist to localStorage whenever state changes
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.error("Failed to save chat sessions to localStorage:", e);
    }
  }, [sessions, activeSessionId, isInitialized]);

  const createNewChat = (): string => {
    const newSession = createNewSessionInstance();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const brandNew = createNewSessionInstance();
        setActiveSessionId(brandNew.id);
        return [brandNew];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });

    // Delete in Supabase
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_chat_session", payload: { sessionId: id } }),
    }).catch(() => {});
  };

  const setSessionMessages = (sessionId: string, messages: ChatMessage[], newTitle?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const title = newTitle !== undefined ? newTitle : s.title;
          return {
            ...s,
            messages,
            title,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );

    // Find any new unsynced messages and sync them to Supabase
    const targetSession = sessions.find((s) => s.id === sessionId);
    const sessionTitle = newTitle || targetSession?.title || "Диалог с ИИ";

    messages.forEach((msg) => {
      if (msg.role !== "system" && !syncedMsgIds.current.has(msg.id)) {
        syncedMsgIds.current.add(msg.id);
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_chat_message",
            payload: {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              sessionId,
              sessionTitle,
              attachments: msg.attachments,
            },
          }),
        }).catch((err) => console.warn("Supabase message sync error:", err));
      }
    });
  };

  const clearAllChats = () => {
    const fresh = createNewSessionInstance();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || STATIC_DEFAULT_SESSION;

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        activeSession,
        createNewChat,
        selectSession,
        deleteSession,
        setSessionMessages,
        clearAllChats,
        isSyncing,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
