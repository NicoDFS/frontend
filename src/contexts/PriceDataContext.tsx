'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PriceDataContextType {
  priceChange24h: number;
  setPriceChange24h: (value: number) => void;
}

const PriceDataContext = createContext<PriceDataContextType | undefined>(undefined);

export function PriceDataProvider({ children }: { children: React.ReactNode }) {
  const [priceChange24h, setPriceChange24h] = useState<number>(0);

  return (
    <PriceDataContext.Provider value={{ priceChange24h, setPriceChange24h }}>
      {children}
    </PriceDataContext.Provider>
  );
}

export function usePriceDataContext() {
  const context = useContext(PriceDataContext);
  if (context === undefined) {
    throw new Error('usePriceDataContext must be used within a PriceDataProvider');
  }
  return context;
}
