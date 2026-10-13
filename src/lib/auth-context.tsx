"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  username: string;
  name: string;
  role: "admin" | "client";
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateName: (newName: string) => void;
  isLoading: boolean;
}

const ACCOUNTS: Record<string, { password: string; name: string; role: "admin" | "client" }> = {
  admin: {
    password: "Geonedra2026!",
    name: "Администратор",
    role: "admin",
  },
  antonv: {
    password: "Quarry2026_ans",
    name: "Антон В.",
    role: "client",
  },
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => false,
  logout: () => {},
  updateName: () => {},
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("geonedra_auth_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) {
          const customName = localStorage.getItem(`geo_ai_custom_name_${parsed.username}`);
          if (customName) {
            parsed.name = customName;
          }
        }
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem("geonedra_auth_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, pass: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    const account = ACCOUNTS[cleanUser];
    if (account && account.password === cleanPass) {
      const customName = typeof window !== "undefined" ? localStorage.getItem(`geo_ai_custom_name_${cleanUser}`) : null;
      const authUser: AuthUser = {
        username: cleanUser,
        name: customName || account.name,
        role: account.role,
      };
      setUser(authUser);
      localStorage.setItem("geonedra_auth_user", JSON.stringify(authUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("geonedra_auth_user");
  };

  const updateName = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || !user) return;
    const updatedUser: AuthUser = {
      ...user,
      name: trimmed,
    };
    setUser(updatedUser);
    try {
      localStorage.setItem("geonedra_auth_user", JSON.stringify(updatedUser));
      localStorage.setItem(`geo_ai_custom_name_${user.username}`, trimmed);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateName, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
