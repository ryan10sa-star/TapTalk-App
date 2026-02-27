import { createContext, useContext, useState, type ReactNode } from "react";

interface PartnerContextValue {
  locked: boolean;
  setLocked: (v: boolean) => void;
}

const PartnerContext = createContext<PartnerContextValue>({ locked: false, setLocked: () => {} });

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  return <PartnerContext.Provider value={{ locked, setLocked }}>{children}</PartnerContext.Provider>;
}

export function usePartner() {
  return useContext(PartnerContext);
}
