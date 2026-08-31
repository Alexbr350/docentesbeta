"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { llamarAsistenteIA } from "../lib/ia";

export default function ModalMejorarIA({
  visible,
  original,
  tipo,
  onUsar,
  onCancelar,
}: {
  visible: boolean;
  original: string;
  tipo: string;
  onUsar: (texto: string) => void;
  onCancelar: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [sugerencia, setSugerencia] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSugerencia("");
    setError("");
    setCargando(true);
    llamarAsistenteIA("mejorar", original, tipo)
      .then((resultado) => setSugerencia(resultado))
      .catch((err) => setError(err?.message || "No se pudo generar la sugerencia."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles size={16} className="text-violet-500" /> Mejorar con IA
          </h3>
          <button onClick={onCancelar} className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>

        {cargando && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Loader2 size={28} className="text-violet-500 animate-spin" />
            <p className="text-sm text-slate-400">Generando sugerencia...</p>
          </div>
        )}

        {!cargando && error && (
          <div className="text-center py-10">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={onCancelar}
              className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold transition active:scale-95"
            >
              Cerrar
            </button>
          </div>
        )}

        {!cargando && !error && sugerencia && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tu versión</p>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {original}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Sparkles size={12} /> Sugerencia de la IA
                </p>
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {sugerencia}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={onCancelar}
                className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold transition active:scale-95"
              >
                Mantener la mía
              </button>
              <button
                onClick={() => onUsar(sugerencia)}
                className="flex items-center justify-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow transition active:scale-95"
              >
                <Sparkles size={14} /> Usar esta versión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
