
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Custom hook for using local storage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export type CompanyInfo = {
  name: string;
  logo: string; // Base64 data URL
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPincode: string;
  addressCountry: string;
  contactNumber: string;
  email: string;
};

// Default values
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "",
  logo: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressPincode: "",
  addressCountry: "",
  contactNumber: "",
  email: "",
};

type CompanyInfoContextType = {
  companyInfo: CompanyInfo;
  saveCompanyInfo: (info: CompanyInfo) => void;
};

const CompanyInfoContext = createContext<CompanyInfoContextType | undefined>(undefined);

export const CompanyInfoProvider = ({ children }: { children: ReactNode }) => {
  const [companyInfo, setCompanyInfo] = useLocalStorage<CompanyInfo>("settings-company-info", DEFAULT_COMPANY_INFO);

  const saveCompanyInfo = (info: CompanyInfo) => {
    setCompanyInfo(info);
  };

  const value = {
    companyInfo,
    saveCompanyInfo,
  };

  return (
    <CompanyInfoContext.Provider value={value}>
      {children}
    </CompanyInfoContext.Provider>
  );
};

export const useCompanyInfo = () => {
  const context = useContext(CompanyInfoContext);
  if (context === undefined) {
    throw new Error("useCompanyInfo must be used within a CompanyInfoProvider");
  }
  return context;
};
