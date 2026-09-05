"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { llamarAsistenteIA } from "../lib/ia";

// Sugiere una estructura/actividades para una planeación de clase, a partir
// de lo que el practicante ya escribió (aunque sea poco, como solo el tema).
// A diferencia de "Mejorar con IA" (que pule el texto existente sin agregar
// contenido nuevo), aquí la IA sí propone contenido nuevo — por eso la
// acción es "insertar" (se agrega al final de lo ya escrito), nunca
// reemplaza ni publica nada automáticamente.
export default function ModalSugerenciaPlaneacion({
  visible,
  contenidoActual,
  onInsertar,
  onCancelar,
}: {
  visible: boolean;
  contenidoActual: string;
  onInsertar: (textoCompleto: string) => void;
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
    llamarAsistenteIA("planeacion", contenidoActual, "Planeación")
      .then((resultado) => setSugerencia(resultado))
      .catch((err) => setError(err?.message || "No se pudo generar la sugerencia."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const insertar = () => {
    const separador = contenidoActual.trim() ? "\n\n" : "";
    onInsertar(contenidoActual + separador + sugerencia);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto animate-modal-pop">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles size={16} className="text-violet-500" /> Sugerir ideas para tu planeación
          </h3>
          <button onClick={onCancelar} className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>

        {cargando && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Loader2 size={28} className="text-violet-500 animate-spin" />
            <p className="text-sm text-slate-400">Pensando ideas para tu planeación...</p>
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

        {!cargando && !error && (
          <div className="animate-fade-in-up">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Sparkles size={12} /> Sugerencia — puedes editarla antes de insertarla
            </p>
            <textarea
              value={sugerencia}
              onChange={(e) => setSugerencia(e.target.value)}
              rows={10}
              className="w-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:border-violet-400"
            />
            <p className="text-[11px] text-slate-400 mt-2 mb-5">
              Esto se agregará al final de lo que ya llevas escrito, no reemplaza tu texto. Revísala y ajústala antes de publicar.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={onCancelar}
                className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold transition active:scale-95"
              >
                Descartar
              </button>
              <button
                onClick={insertar}
                disabled={!sugerencia.trim()}
                className="flex items-center justify-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={14} /> Insertar en mi planeación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
