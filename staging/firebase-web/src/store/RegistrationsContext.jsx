import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "agriwatch_registrations_v1";
const RegistrationsContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to empty seed
  }
  // A couple of seed requests so the Admin verification queue isn't empty
  // on first run — makes the feature demoable immediately.
  return [
    {
      id: "REQ-1001",
      role: "admin",
      phone: "+92 300 1234567",
      designation: "District Coordinator",
      district: "Multan",
      status: "Pending",
      date: "2026-08-10",
    },
    {
      id: "REQ-1002",
      role: "farmer",
      phone: "+92 301 7654321",
      name: "Bashir Ahmed",
      district: "Khairpur",
      tehsil: "Kot Diji",
      crop: "wheat",
      farmSize: "5 acres",
      status: "Pending",
      date: "2026-08-11",
    },
  ];
}

export function RegistrationsProvider({ children }) {
  const [registrations, setRegistrations] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    } catch {
      // storage full — data still works for this session
    }
  }, [registrations]);

  function addRegistration(data) {
    const id = `REQ-${1000 + registrations.length + 1}`;
    const record = {
      id,
      status: data.role === "public" ? "Approved" : "Pending",
      date: new Date().toISOString().slice(0, 10),
      ...data,
    };
    setRegistrations((prev) => [record, ...prev]);
    return id;
  }

  function setStatus(id, status) {
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <RegistrationsContext.Provider value={{ registrations, addRegistration, setStatus }}>
      {children}
    </RegistrationsContext.Provider>
  );
}

export function useRegistrations() {
  const ctx = useContext(RegistrationsContext);
  if (!ctx) throw new Error("useRegistrations must be used within RegistrationsProvider");
  return ctx;
}
