import { createContext, useContext, useState } from "react";

const MobileNavContext = createContext(null);

export function MobileNavProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider
      value={{ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}
