"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type TipoToast = "exito" | "error";
type ToastItem = { id: number; mensaje: string; tipo: TipoToast; saliendo: boolean };

type ToastContextType = {
  mostrarToast: (mensaje: string, tipo?: TipoToast) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let contadorId = 0;

function ToastCard({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const mostrar = visible && !toast.saliendo;

  return (
    <div
      className={`flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-300 w-full sm:w-80 sm:max-w-[320px] ${
        mostrar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {toast.tipo === "error" ? (
        <XCircle size={18} className="text-red-500 flex-shrink-0" />
      ) : (
        <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
      )}
      <span className="leading-snug">{toast.mensaje}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrarToast = useCallback((mensaje: string, tipo: TipoToast = "exito") => {
    const id = ++contadorId;
    setToasts((prev) => [...prev, { id, mensaje, tipo, saliendo: false }]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, saliendo: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[100] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard toast={t} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      mostrarToast: (mensaje: string) => {
        console.warn("useToast() se usó fuera de <ToastProvider>:", mensaje);
      },
    };
  }
  return ctx;
}
