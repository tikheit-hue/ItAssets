
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import type { SmtpConfig, EmailRecipient } from "@/ai/schemas/email-schema";
import { v4 as uuidv4 } from 'uuid';

// A simple utility to set a cookie.
const setCookie = (name: string, value: any) => {
    if (typeof window !== "undefined") {
        document.cookie = `${name}=${JSON.stringify(value)}; path=/; max-age=31536000; SameSite=Lax`;
    }
};

// A simple utility to get a cookie.
const getCookie = (name: string): string | null => {
    if (typeof window === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
        try {
            return JSON.parse(match[2]);
        } catch (e) {
            return match[2];
        }
    }
    return null;
}

// Custom hook for using local storage with a cookie fallback for server-side reading
function useStoredState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Prioritize local storage, but fallback to cookie if LS is empty
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item);

      const cookieItem = getCookie(key);
      if (cookieItem) return cookieItem as T;

      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const valueStr = JSON.stringify(storedValue);
        window.localStorage.setItem(key, valueStr);
        setCookie(key, storedValue); // Also save to cookie
      } catch (error) {
        console.error(error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export type SqlConfig = {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password?: string;
  authenticationType: "SQL Auth" | "Windows Auth";
  schema?: string;
}

export type DatabaseProvider = "sql" | "firebase";

// Default values
const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
};

const DEFAULT_SQL_CONFIG: SqlConfig = {
    host: "13.232.252.119",
    port: 1433,
    databaseName: "111",
    username: "sa",
    password: "sa1",
    authenticationType: "SQL Auth",
    schema: "dbo"
}

const DEFAULT_RECIPIENTS: EmailRecipient[] = [];

type SettingsContextType = {
  smtpConfig: SmtpConfig;
  sqlConfig: SqlConfig;
  recipients: EmailRecipient[];
  isSmtpConfigured: boolean;
  isDbConfigured: boolean;
  databaseProvider: DatabaseProvider;
  saveSmtpConfig: (config: SmtpConfig) => void;
  saveSqlConfig: (config: SqlConfig) => void;
  saveDatabaseProvider: (provider: DatabaseProvider) => void;
  addRecipient: (recipient: Omit<EmailRecipient, 'id'>) => void;
  removeRecipient: (recipientId: string) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [smtpConfig, setSmtpConfig] = useStoredState<SmtpConfig>("settings-smtp-config", DEFAULT_SMTP_CONFIG);
  const [sqlConfig, setSqlConfig] = useStoredState<SqlConfig>("settings-sql-config", DEFAULT_SQL_CONFIG);
  const [databaseProvider, setDatabaseProvider] = useStoredState<DatabaseProvider>("settings-db-provider", "sql");
  const [recipients, setRecipients] = useStoredState<EmailRecipient[]>("settings-recipients", DEFAULT_RECIPIENTS);

  const isSmtpConfigured = useMemo(() => {
    return !!(smtpConfig.host && smtpConfig.port && smtpConfig.user && smtpConfig.pass && recipients.length > 0);
  }, [smtpConfig, recipients]);

  const isDbConfigured = useMemo(() => {
    if (databaseProvider === 'firebase') return true;
    if (databaseProvider === 'sql') {
        return !!(sqlConfig.host && sqlConfig.databaseName && sqlConfig.username);
    }
    return false;
  }, [databaseProvider, sqlConfig]);

  const saveSmtpConfig = (config: SmtpConfig) => {
    setSmtpConfig(config);
  };
  
  const saveSqlConfig = (config: SqlConfig) => {
    setSqlConfig(config);
  };

  const saveDatabaseProvider = (provider: DatabaseProvider) => {
    setDatabaseProvider(provider);
  }

  const addRecipient = (recipient: Omit<EmailRecipient, 'id'>) => {
    const newRecipient = { ...recipient, id: uuidv4() };
    setRecipients(prev => [...prev, newRecipient]);
  };

  const removeRecipient = (recipientId: string) => {
    setRecipients(prev => prev.filter(r => r.id !== recipientId));
  };

  const value = {
    smtpConfig,
    sqlConfig,
    recipients,
    isSmtpConfigured,
    isDbConfigured,
    databaseProvider,
    saveSmtpConfig,
    saveSqlConfig,
    saveDatabaseProvider,
    addRecipient,
    removeRecipient,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
