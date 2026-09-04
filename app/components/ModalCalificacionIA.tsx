"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, X, Star } from "lucide-react";
import { llamarAsistenteIA } from "../lib/ia";

// La IA responde en el formato exacto pedido en el prompt (ver
// PROMPT_CALIFICACION en app/api/ia/route.ts):
//   Calificación: <número>
//   Justificación: <texto>
// Esta función lo separa en sus dos partes; si el formato no coincide
// (la IA no siguió las instrucciones), numero queda en null y se trata
// como un error de formato en vez de mostrar algo confuso.
function parsearCalificacionIA(texto: string): { numero: number | null; justificacion: string } {
  const matchNumero = texto.match(/calificaci[oó]n\s*:?\s*(\d{1,2})/i);
  let numero: number | null = matchNumero ? parseInt(matchNumero[1], 10) : null;
  if (numero !== null) {
    if (Number.isNaN(numero) || numero < 1 || numero > 10) numero = Math.min(10, Math.max(1, numero || 1));
  }
  const matchJustificacion = texto.match(/justificaci[oó]n\s*:?\s*([\s\S]*)/i);
  const justificacion = matchJustificacion ? matchJustificacion[1].trim() : texto.trim();
  return { numero, justificacion };
}

// Muestra una calificación sugerida por IA con su justificación. Es puramente
// informativo: no hay ningún botón que aplique la calificación por sí solo —
// el evaluador tiene que cerrar el modal y hacer clic manualmente en el
// número (sugerido o cualquier otro) en la cuadrícula 1-10 ya existente. La
// IA nunca califica ni guarda nada directamente.
export default function ModalCalificacionIA({
  visible,
  contenidoPost,
  tipo,
  onCancelar,
}: {
  visible: boolean;
  contenidoPost: string;
  tipo: string;
  onCancelar: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [numero, setNumero] = useState<number | null>(null);
  const [justificacion, setJustificacion] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setNumero(null);
    setJustificacion("");
    setError("");
    setCargando(true);
    llamarAsistenteIA("calificacion", contenidoPost, tipo)
      .then((resultado) => {
        const { numero: n, justificacion: j } = parsearCalificacionIA(resultado);
        if (n === null) {
          setError("La IA no devolvió una calificación en un formato reconocible. Intenta de nuevo.");
          return;
        }
        setNumero(n);
        setJustificacion(j);
      })
      .catch((err) => setError(err?.message || "No se pudo generar la sugerencia."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles size={16} className="text-violet-500" /> Calificación sugerida (IA)
          </h3>
          <button onClick={onCancelar} className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>

        {cargando && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Loader2 size={28} className="text-violet-500 animate-spin" />
            <p className="text-sm text-slate-400">Analizando la publicación...</p>
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

        {!cargando && !error && numero !== null && (
          <>
            <div className="flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-1.5 text-violet-500 mb-1">
                <Star size={13} fill="currentColor" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Sugerencia de la IA</span>
              </div>
              <p className="text-4xl font-extrabold text-violet-600 dark:text-violet-400">
                {numero}<span className="text-lg text-violet-400">/10</span>
              </p>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Justificación</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">{justificacion}</p>
            <p className="text-[11px] text-slate-400 mb-5">
              Esto es solo una sugerencia informativa. Para confirmarla, cierra esta ventana y haz clic manualmente en el número correspondiente (o en cualquier otro que consideres correcto).
            </p>
            <div className="flex justify-end">
              <button
                onClick={onCancelar}
                className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold transition active:scale-95"
              >
                Entendido
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
