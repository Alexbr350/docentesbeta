"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { llamarAsistenteIA, type TareaIA } from "../lib/ia";

// Modal genérico de "borrador sugerido por IA": arranca la generación al
// abrirse, muestra el resultado en un textarea editable, y deja que quien
// lo usa decida si lo usa tal cual, lo edita, o lo descarta — nunca se
// envía nada automáticamente. Se reutiliza para varios escenarios (cambia
// solo la `tarea` que se le pide a la API y los textos del modal):
//  - "retroalimentacion" (Admin/Maestro, comentario para el practicante)
//  - "respuesta_comunidad" (Comunidad, respuesta a una pregunta)
export default function ModalSugerenciaIA({
  visible,
  contenidoPost,
  tipo,
  colorTema = "violet",
  tarea = "retroalimentacion",
  titulo = "Sugerencia de retroalimentación (IA)",
  etiquetaBorrador = "Borrador — puedes editarlo antes de usarlo",
  textoCargando = "Generando sugerencia...",
  textoAyuda = "Este texto solo se colocará en el campo de retroalimentación. Tú decides si lo editas y cuándo enviarlo.",
  textoBotonUsar = "Usar este borrador",
  onUsar,
  onCancelar,
}: {
  visible: boolean;
  contenidoPost: string;
  tipo: string;
  colorTema?: "violet" | "purple" | "green";
  tarea?: TareaIA;
  titulo?: string;
  etiquetaBorrador?: string;
  textoCargando?: string;
  textoAyuda?: string;
  textoBotonUsar?: string;
  onUsar: (texto: string) => void;
  onCancelar: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setBorrador("");
    setError("");
    setCargando(true);
    llamarAsistenteIA(tarea, contenidoPost, tipo)
      .then((resultado) => setBorrador(resultado))
      .catch((err) => setError(err?.message || "No se pudo generar el borrador."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const boton =
    colorTema === "green"
      ? "bg-green-600 hover:bg-green-700"
      : colorTema === "purple"
      ? "bg-purple-600 hover:bg-purple-700"
      : "bg-violet-600 hover:bg-violet-700";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto animate-modal-pop">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles size={16} className="text-violet-500" /> {titulo}
          </h3>
          <button onClick={onCancelar} className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>

        {cargando && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Loader2 size={28} className="text-violet-500 animate-spin" />
            <p className="text-sm text-slate-400">{textoCargando}</p>
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
              <Sparkles size={12} /> {etiquetaBorrador}
            </p>
            <textarea
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              rows={5}
              className="w-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:border-violet-400"
            />
            <p className="text-[11px] text-slate-400 mt-2 mb-5">
              {textoAyuda}
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={onCancelar}
                className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => onUsar(borrador)}
                disabled={!borrador.trim()}
                className={`flex items-center justify-center gap-1.5 text-sm ${boton} text-white px-5 py-2.5 rounded-xl font-semibold shadow transition active:scale-95 disabled:opacity-50`}
              >
                <Sparkles size={14} /> {textoBotonUsar}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
