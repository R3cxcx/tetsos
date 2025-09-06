import React, { createContext, useContext, useState } from 'react';

interface RefreshContextType {
  refreshFunction: (() => void) | null;
  setRefreshFunction: (fn: (() => void) | null) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshFunction, setRefreshFunction] = useState<(() => void) | null>(null);

  return (
    <RefreshContext.Provider value={{ refreshFunction, setRefreshFunction }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}