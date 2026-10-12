import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const iconFor = { success: CheckCircle2, error: XCircle, info: Info };
const toneFor = {
  success: "border-primary/30 text-primary",
  error: "border-danger/30 text-danger",
  info: "border-line text-ink/70",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const showToast = useCallback((message, type = "success", duration = 3200) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 inset-x-0 z-[999] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => {
          const Icon = iconFor[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`toast-in pointer-events-auto flex items-center gap-2.5 bg-surface border ${toneFor[t.type] || toneFor.info} rounded-lg shadow-lg px-4 py-3 text-sm font-medium max-w-sm w-full sm:w-auto`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-ink flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-ink/30 hover:text-ink/60 shrink-0">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
