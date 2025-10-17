
"use client";

import { AuthProvider } from "@/context/auth-context";
import { ConfigurationProvider } from "@/context/configuration-context";
import { SettingsProvider } from "@/context/settings-context";
import { CompanyInfoProvider } from "@/context/company-info-context";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ConfigurationProvider>
          <CompanyInfoProvider>
            <FirebaseErrorListener />
            {children}
            <Toaster />
          </CompanyInfoProvider>
        </ConfigurationProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
