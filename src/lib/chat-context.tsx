"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
      const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);

      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const validActive = parsed.find((s: ChatSession) => s.id === savedActiveId);
          setActiveSessionId(validActive ? validActive.id : parsed[0].id);
          setIsInitialized(true);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved chat sessions from localStorage:", e);
    }

    // Default if nothing in storage
    const initial = createNewSessionInstance();
    setSessions([initial]);
    setActiveSessionId(initial.id);
    setIsInitialized(true);
  }, []);

  // Save sessions to localStorage whenever they change (after initial hydration)
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
  };

  const setSessionMessages = (sessionId: string, messages: ChatMessage[], newTitle?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages,
            title: newTitle !== undefined ? newTitle : s.title,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
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
