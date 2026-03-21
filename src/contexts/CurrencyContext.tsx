import React, { createContext, useContext, useState } from "react";

export const CURRENCIES = {
  USD: { symbol: "$", label: "USD", rate: 1 },
  JPY: { symbol: "¥", label: "JPY", rate: 150 },
  EUR: { symbol: "€", label: "EUR", rate: 0.92 },
  GBP: { symbol: "£", label: "GBP", rate: 0.79 },
  AUD: { symbol: "A$", label: "AUD", rate: 1.53 },
  SGD: { symbol: "S$", label: "SGD", rate: 1.34 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (usdPrice: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>(null!);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem("roomai_currency") as CurrencyCode) ?? "USD";
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("roomai_currency", c);
  };

  const formatPrice = (usdPrice: number): string => {
    const { symbol, rate } = CURRENCIES[currency];
    const converted = usdPrice * rate;

    if (currency === "JPY") {
      return `${symbol}${Math.round(converted).toLocaleString()}`;
    }

    return `${symbol}${converted.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
