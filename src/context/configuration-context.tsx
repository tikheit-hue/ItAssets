
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Default options
const DEFAULT_PROCESSORS = ["Intel i5 11th Gen", "Intel i7 12th Gen", "Ryzen 5", "Ryzen 7"];
const DEFAULT_RAMS = ["8GB", "16GB", "32GB", "64GB"];
const DEFAULT_STORAGES = ["256GB SSD", "512GB SSD", "1TB SSD", "1TB HDD", "2TB HDD"];
const DEFAULT_ASSET_TYPES = ["Laptop", "Desktop", "Server", "VM", "Monitor", "Peripheral"];
const DEFAULT_DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Human Resources", "Finance"];
const DEFAULT_DESIGNATIONS = ["Software Engineer", "Sales Executive", "Marketing Manager", "HR Generalist", "Accountant"];


type ConfigurationContextType = {
  processors: string[];
  setProcessors: React.Dispatch<React.SetStateAction<string[]>>;
  rams: string[];
  setRams: React.Dispatch<React.SetStateAction<string[]>>;
  storages: string[];
  setStorages: React.Dispatch<React.SetStateAction<string[]>>;
  assetTypes: string[];
  setAssetTypes: React.Dispatch<React.SetStateAction<string[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  designations: string[];
  setDesignations: React.Dispatch<React.SetStateAction<string[]>>;
};

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

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

export const ConfigurationProvider = ({ children }: { children: ReactNode }) => {
  const [processors, setProcessors] = useLocalStorage<string[]>("config-processors", DEFAULT_PROCESSORS);
  const [rams, setRams] = useLocalStorage<string[]>("config-rams", DEFAULT_RAMS);
  const [storages, setStorages] = useLocalStorage<string[]>("config-storages", DEFAULT_STORAGES);
  const [assetTypes, setAssetTypes] = useLocalStorage<string[]>("config-assetTypes", DEFAULT_ASSET_TYPES);
  const [departments, setDepartments] = useLocalStorage<string[]>("config-departments", DEFAULT_DEPARTMENTS);
  const [designations, setDesignations] = useLocalStorage<string[]>("config-designations", DEFAULT_DESIGNATIONS);

  const value = {
    processors,
    setProcessors,
    rams,
    setRams,
    storages,
    setStorages,
    assetTypes,
    setAssetTypes,
    departments,
    setDepartments,
    designations,
    setDesignations,
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error("useConfiguration must be used within a ConfigurationProvider");
  }
  return context;
};
