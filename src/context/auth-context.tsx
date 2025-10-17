
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User as FirebaseAuthUser } from "@/lib/firebase";
import type { User, UserRole } from "@/services/user-service";
import * as userService from "@/services/user-service";
import { useSettings } from "./settings-context";

type AuthContextType = {
  user: FirebaseAuthUser | null;
  loading: boolean;
  tenantId: string | null;
  userRole: UserRole | null;
  userInfo: User | null;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, tenantId: null, userRole: null, userInfo: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const { databaseProvider, sqlConfig, isDbConfigured } = useSettings();

  useEffect(() => {
    const authStateSubscription = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        if (databaseProvider === 'sql' && isDbConfigured) {
            const tenant = fbUser.uid; 
            setTenantId(tenant);
            try {
                const users = await userService.getUsers(databaseProvider, sqlConfig, tenant);
                const currentUserInfo = users.find(u => u.id === fbUser.uid);
                if (currentUserInfo) {
                    setUserInfo(currentUserInfo);
                    setUserRole(currentUserInfo.role);
                } else {
                    setUserInfo(null);
                    setUserRole("SuperAdmin");
                }
            } catch (error: any) {
                console.warn("Could not fetch user roles, assuming SuperAdmin. This is expected if the database is not set up yet.", error.message);
                // Fallback to SuperAdmin role if there's an error during role fetch (e.g., table not found)
                setUserRole("SuperAdmin");
                setUserInfo(null);
            }
        } else {
             setTenantId(fbUser.uid);
             setUserRole("SuperAdmin");
             setUserInfo(null);
        }
      } else {
        setTenantId(null);
        setUserRole(null);
        setUserInfo(null);
      }
      setLoading(false);
    });

    return () => authStateSubscription();
  }, [databaseProvider, sqlConfig, isDbConfigured]);

  const value = { user, loading, tenantId, userRole, userInfo };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
