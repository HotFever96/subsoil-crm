"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getUserWelcomeMsg } from "@/lib/mock-data";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: number;
  workspace?: "geo" | "service";
}

export function cleanChatTitle(title: string): string {
  if (!title) return "Новый чат";
  let cleaned = title.trim();
  // Remove markdown headers
  cleaned = cleaned.replace(/^#+\s*/, "");
  // Remove code blocks and JSON structures
  cleaned = cleaned.replace(/```[a-z]*\s*[\s\S]*?```/gi, "");
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, "");
  cleaned = cleaned.replace(/["']?(?:heading|text|content)["']?\s*:\s*["']?/gi, "");
  // Remove wrapping quotes and brackets
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Fallback if empty or starts with JSON/code brackets
  if (!cleaned || cleaned.startsWith("{") || cleaned.startsWith("[") || cleaned.startsWith("###")) {
    return "Диалог с ИИ";
  }
  if (cleaned.length > 36) {
    cleaned = cleaned.slice(0, 34) + "...";
  }
  return cleaned;
}

export function detectChatWorkspace(chat: { title?: string; workspace?: string; messages?: ChatMessage[] }): "geo" | "service" {
  const titleLower = (chat.title || "").toLowerCase();

  const geoStrongKeywords = [
    "сведения о н",
    "недропольз",
    "лицензи",
    "геолог",
    "карьер",
    "месторожд",
    "участок недр",
    "пгин",
    "тпр",
    "пласт",
    "скважин",
    "запасы",
    "маркшейд",
  ];

  for (const kw of geoStrongKeywords) {
    if (titleLower.includes(kw)) {
      return "geo";
    }
  }

  if (chat.workspace === "service" || chat.workspace === "geo") {
    return chat.workspace;
  }

  const textToScan = [
    chat.title || "",
    ...(chat.messages || []).slice(0, 8).map((m) => m.content || ""),
  ].join(" ").toLowerCase();

  for (const kw of geoStrongKeywords) {
    if (textToScan.includes(kw)) {
      return "geo";
    }
  }

  const serviceKeywords = [
    "нормо-час",
    "нормочас",
    "заказ-наряд",
    "заказ наряд",
    "зн-",
    "поворотн",
    "кулак",
    "сцеплен",
    "камаз",
    "kamaz",
    "tiguan",
    "тигуан",
    "запчаст",
    "автосервис",
    "чайка-сервис",
    "росско",
    "армтек",
    "автодок",
    "дефектовк",
    "подвеск",
    "vin",
    "вин",
    "пробег",
    "шиномонтаж",
    "сто ",
    "шеф-мастер",
    "шеф мастер",
  ];

  for (const kw of serviceKeywords) {
    if (textToScan.includes(kw)) {
      return "service";
    }
  }
  return "geo";
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession;
  createNewChat: (workspace?: "geo" | "service") => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setSessionMessages: (sessionId: string, messages: ChatMessage[], newTitle?: string) => void;
  clearAllChats: () => void;
  isSyncing: boolean;
}

const getStorageSessionsKey = (u: string) => `geo_ai_chat_sessions_${u || "guest"}_v5`;
const getStorageActiveIdKey = (u: string) => `geo_ai_active_session_id_${u || "guest"}_v5`;

const generateUniqueSessionId = () =>
  `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const STATIC_FALLBACK_SESSION: ChatSession = {
  id: "session-fallback",
  title: "Новый чат",
  createdAt: "Сегодня",
  updatedAt: 0,
  messages: [],
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedMsgIds = useRef<Set<string>>(new Set());

  // 1. Re-initialize chat sessions whenever the active authenticated user changes
  useEffect(() => {
    if (!currentUsername) {
      setSessions([]);
      setActiveSessionId("");
      setIsInitialized(false);
      syncedMsgIds.current = new Set();
      return;
    }

    syncedMsgIds.current = new Set();
    const sessionsKey = getStorageSessionsKey(currentUsername);
    const activeIdKey = getStorageActiveIdKey(currentUsername);

    let loadedSessions: ChatSession[] = [];

    try {
      // Check v5 first
      const savedV5 = localStorage.getItem(sessionsKey);
      const savedActiveId = localStorage.getItem(activeIdKey);

      if (savedV5) {
        const parsed = JSON.parse(savedV5);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly deduplicate by ID and ensure no duplicate or corrupted session-init IDs
          const seenIds = new Set<string>();
          parsed.forEach((s: any) => {
            if (!s || typeof s !== "object") return;
            const validId = s.id && typeof s.id === "string" ? s.id : generateUniqueSessionId();
            if (!seenIds.has(validId)) {
              seenIds.add(validId);
              const ws = s.workspace || detectChatWorkspace(s);
              loadedSessions.push({
                ...s,
                id: validId,
                title: cleanChatTitle(s.title),
                workspace: ws,
              });
            }
          });

          if (loadedSessions.length > 0) {
            setSessions(loadedSessions);
            const validActive = loadedSessions.find((s) => s.id === savedActiveId);
            setActiveSessionId(validActive ? validActive.id : loadedSessions[0].id);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved chat sessions from localStorage:", e);
    }

    // If no valid sessions exist, create exactly ONE fresh session with a unique ID
    if (loadedSessions.length === 0) {
      const freshId = generateUniqueSessionId();
      const defaultWs = typeof document !== "undefined" && document.documentElement.getAttribute("data-business") === "chaika-service" ? "service" : "geo";
      const isService = defaultWs === "service";

      const freshSession: ChatSession = {
        id: freshId,
        title: isService ? "Чат по СТО" : "Новый чат",
        createdAt: "Сегодня",
        updatedAt: Date.now(),
        workspace: defaultWs,
        messages: isService
          ? [
              {
                id: `msg-welcome-service-${Date.now()}`,
                role: "assistant",
                content: `Здравствуйте, ${user?.name || "Мастер"}! Я — Шеф-мастер СТО «Чайка-Сервис CRM».\n\nГотов рассчитать нормо-часы, открыть заказ-наряд, выполнить проценку запчастей по оптовым складам (Росско, Армтек, Автодок) или провести дефектовку узлов.\n\nКакая задача по автопарку в работе?`,
                created_at: new Date().toISOString(),
              },
            ]
          : [getUserWelcomeMsg(currentUsername, user?.name)],
      };
      loadedSessions = [freshSession];
      setSessions([freshSession]);
      setActiveSessionId(freshId);

      try {
        localStorage.setItem(sessionsKey, JSON.stringify([freshSession]));
        localStorage.setItem(activeIdKey, freshId);
      } catch {}
    }

    setIsInitialized(true);

    // Track already known message IDs
    loadedSessions.forEach((s) => {
      s.messages.forEach((m) => syncedMsgIds.current.add(m.id));
    });

    // Fetch cloud messages strictly for this authenticated user from Supabase
    const fetchFromSupabase = async () => {
      try {
        setIsSyncing(true);
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_chats", username: currentUsername }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.rows) && data.rows.length > 0) {
          // Group Supabase rows strictly by session_id
          const sessionMap = new Map<string, { title: string; messages: ChatMessage[] }>();

          data.rows.forEach((row: any) => {
            const sessId = row.citations?.session_id;
            if (!sessId) return;

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
              sessionMap.set(sessId, {
                title: cleanChatTitle(sessTitle),
                messages: [],
              });
            }
            sessionMap.get(sessId)!.messages.push(msg);
          });

          if (sessionMap.size > 0) {
            setSessions((prev) => {
              const merged = [...prev];
              sessionMap.forEach((val, sessId) => {
                const existingIdx = merged.findIndex((s) => s.id === sessId);
                if (existingIdx >= 0) {
                  const existingMsgIds = new Set(merged[existingIdx].messages.map((m) => m.id));
                  const newMsgs = val.messages.filter((m) => !existingMsgIds.has(m.id));
                  if (newMsgs.length > 0) {
                    const updatedMsgs = [...merged[existingIdx].messages, ...newMsgs];
                    const ws = merged[existingIdx].workspace || detectChatWorkspace({ title: merged[existingIdx].title, messages: updatedMsgs });
                    merged[existingIdx] = {
                      ...merged[existingIdx],
                      title: cleanChatTitle(merged[existingIdx].title || val.title),
                      workspace: ws,
                      messages: updatedMsgs,
                    };
                  }
                } else {
                  const ws = detectChatWorkspace({ title: val.title, messages: val.messages });
                  merged.unshift({
                    id: sessId,
                    title: cleanChatTitle(val.title),
                    createdAt: "В облаке",
                    updatedAt: Date.now(),
                    workspace: ws,
                    messages: val.messages,
                  });
                }
              });
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn("Supabase chat fetch error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchFromSupabase();
  }, [currentUsername]);

  // 2. Persist to user-scoped localStorage whenever state changes
  useEffect(() => {
    if (!isInitialized || !currentUsername || sessions.length === 0) return;
    try {
      localStorage.setItem(getStorageSessionsKey(currentUsername), JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(getStorageActiveIdKey(currentUsername), activeSessionId);
      }
    } catch (e) {
      console.error("Failed to save chat sessions to localStorage:", e);
    }
  }, [sessions, activeSessionId, isInitialized, currentUsername]);

  // Create a brand new distinct chat session with a unique ID and workspace tag
  const createNewChat = (workspace?: "geo" | "service"): string => {
    const defaultWs = typeof document !== "undefined" && document.documentElement.getAttribute("data-business") === "chaika-service" ? "service" : "geo";
    const targetWs = workspace || defaultWs;
    const newId = generateUniqueSessionId();
    const isService = targetWs === "service";

    const initialMessage: ChatMessage = isService
      ? {
          id: `msg-welcome-service-${Date.now()}`,
          role: "assistant",
          content: `Здравствуйте, ${user?.name || "Мастер"}! Я — Шеф-мастер СТО «Чайка-Сервис CRM».\n\nГотов рассчитать нормо-часы, открыть заказ-наряд, выполнить проценку запчастей по оптовым складам (Росско, Армтек, Автодок) или провести дефектовку узлов.\n\nКакая задача по автопарку в работе?`,
          created_at: new Date().toISOString(),
        }
      : getUserWelcomeMsg(currentUsername, user?.name);

    const newSession: ChatSession = {
      id: newId,
      title: isService ? "Чат по СТО" : "Новый чат",
      createdAt: "Сегодня",
      updatedAt: Date.now(),
      workspace: targetWs,
      messages: [initialMessage],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    return newId;
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const brandNewId = generateUniqueSessionId();
        const defaultWs = typeof document !== "undefined" && document.documentElement.getAttribute("data-business") === "chaika-service" ? "service" : "geo";
        const isService = defaultWs === "service";
        const brandNew: ChatSession = {
          id: brandNewId,
          title: isService ? "Чат по СТО" : "Новый чат",
          createdAt: "Сегодня",
          updatedAt: Date.now(),
          workspace: defaultWs,
          messages: isService
            ? [
                {
                  id: `msg-welcome-service-${Date.now()}`,
                  role: "assistant",
                  content: `Здравствуйте, ${user?.name || "Мастер"}! Я — Шеф-мастер СТО «Чайка-Сервис CRM».\n\nГотов рассчитать нормо-часы, открыть заказ-наряд, выполнить проценку запчастей по оптовым складам (Росско, Армтек, Автодок) или провести дефектовку узлов.\n\nКакая задача по автопарку в работе?`,
                  created_at: new Date().toISOString(),
                },
              ]
            : [getUserWelcomeMsg(currentUsername, user?.name)],
        };
        setActiveSessionId(brandNewId);
        return [brandNew];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });

    // Delete in Supabase strictly for this user
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_chat_session",
          payload: { sessionId: id, username: currentUsername },
        }),
      }).catch(() => {});
    }
  };

  const setSessionMessages = (sessionId: string, messages: ChatMessage[], newTitle?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        // ONLY update the session with this exact sessionId
        if (s.id === sessionId) {
          const rawTitle = newTitle !== undefined ? newTitle : s.title;
          const title = cleanChatTitle(rawTitle);
          const ws = s.workspace || detectChatWorkspace({ title, messages });
          return {
            ...s,
            messages,
            title,
            workspace: ws,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );

    // Find any new unsynced messages and sync them to Supabase tagged with username
    const targetSession = sessions.find((s) => s.id === sessionId);
    const sessionTitle = cleanChatTitle(newTitle || targetSession?.title || "Диалог с ИИ");

    if (currentUsername) {
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
                username: currentUsername,
              },
            }),
          }).catch((err) => console.warn("Supabase message sync error:", err));
        }
      });
    }
  };

  const clearAllChats = () => {
    const freshId = generateUniqueSessionId();
    const defaultWs = typeof document !== "undefined" && document.documentElement.getAttribute("data-business") === "chaika-service" ? "service" : "geo";
    const isService = defaultWs === "service";
    const fresh: ChatSession = {
      id: freshId,
      title: isService ? "Чат по СТО" : "Новый чат",
      createdAt: "Сегодня",
      updatedAt: Date.now(),
      workspace: defaultWs,
      messages: isService
        ? [
            {
              id: `msg-welcome-service-${Date.now()}`,
              role: "assistant",
              content: `Здравствуйте, ${user?.name || "Мастер"}! Я — Шеф-мастер СТО «Чайка-Сервис CRM».\n\nГотов рассчитать нормо-часы, открыть заказ-наряд, выполнить проценку запчастей по оптовым складам (Росско, Армтек, Автодок) или провести дефектовку узлов.\n\nКакая задача по автопарку в работе?`,
              created_at: new Date().toISOString(),
            },
          ]
        : [getUserWelcomeMsg(currentUsername, user?.name)],
    };
    setSessions([fresh]);
    setActiveSessionId(freshId);
  };

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0] ||
    STATIC_FALLBACK_SESSION;

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
