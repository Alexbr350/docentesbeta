"use client";
import { useEffect, useState } from "react";
import { BadgeCheck, X, BookOpen, ClipboardList, PenLine, Paperclip, Star } from "lucide-react";
import { METAS_CERTIFICACION } from "../lib/certificado";

const ICONOS_META: Record<string, any> = {
  "Diario": BookOpen,
  "Planeación": ClipboardList,
  "Narrativa": PenLine,
  "Extra": Paperclip,
};

type Practicante = { email: string; nombre?: string };

export default function ModalCertificarFinalizacion({
  visible,
  practicante,
  posts,
  onCertificar,
  onCancelar,
}: {
  visible: boolean;
  practicante: Practicante | null;
  posts: any[];
  onCertificar: (comentario: string) => Promise<void> | void;
  onCancelar: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [certificando, setCertificando] = useState(false);

  useEffect(() => {
    if (visible) {
      setComentario("");
      setCertificando(false);
    }
  }, [visible]);

  if (!visible || !practicante) return null;

  const postsDelPracticante = posts.filter((p: any) => p.email === practicante.email);
  const calificados = postsDelPracticante.filter((p: any) => typeof p.calificacion === "number");
  const promedio = calificados.length > 0
    ? calificados.reduce((s: number, p: any) => s + p.calificacion, 0) / calificados.length
    : null;

  const confirmar = async () => {
    setCertificando(true);
    await onCertificar(comentario.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <BadgeCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">Certificar finalización</h3>
              <p className="text-xs text-slate-400">{practicante.nombre || "Practicante"} · {practicante.email}</p>
            </div>
          </div>
          <button onClick={onCancelar}>
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">Resumen de progreso</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(METAS_CERTIFICACION).map(([tipo, meta]) => {
              const Icono = ICONOS_META[tipo];
              const cantidad = postsDelPracticante.filter((p: any) => p.tipo === tipo).length;
              return (
                <div key={tipo} className="bg-white dark:bg-slate-900 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Icono size={14} className="text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-100">{cantidad}/{meta}</p>
                    <p className="text-[10px] text-slate-400 truncate">{tipo}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Star size={13} className="text-amber-500" />
            {promedio !== null
              ? <span>Calificación promedio: <strong className="text-gray-800 dark:text-slate-100">{promedio.toFixed(1)}/10</strong></span>
              : <span>Sin publicaciones calificadas todavía</span>}
          </div>
        </div>

        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
          Comentario u observación final (opcional)
        </label>
        <textarea
          placeholder="Ej. Excelente desempeño durante todo el semestre, cumplió con todas las metas de forma consistente."
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none mb-5 focus:outline-none focus:border-blue-400"
        />

        <p className="text-xs text-slate-400 mb-4">
          Al certificar, el practicante podrá descargar su certificado de finalización de inmediato. Esta acción no se puede deshacer desde aquí.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 px-4 py-2">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={certificando}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
          >
            <BadgeCheck size={15} /> {certificando ? "Certificando..." : "Certificar"}
          </button>
        </div>
      </div>
    </div>
  );
}
