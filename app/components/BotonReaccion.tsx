"use client";
import { useRef, useState } from "react";
import { REACCIONES, reaccionPorTipo, TipoReaccion } from "../lib/reacciones";

// Botón de reacción estilo Facebook: un clic simple aplica/quita la reacción
// por default (👍 Me gusta); al pasar el mouse encima (o mantener presionado
// en móvil) aparece un menú flotante con las 6 opciones. Se usa tanto en
// publicaciones como en comentarios (con `compacto` para el tamaño chico).
type Props = {
  miReaccion: TipoReaccion | null | undefined;
  onClicPrincipal: () => void;
  onElegir: (tipo: TipoReaccion) => void;
  justPopped?: boolean;
  compacto?: boolean;
};

const RETRASO_ABRIR_HOVER = 450;
const RETRASO_CERRAR = 250;
const RETRASO_PRESION_LARGA = 450;

export default function BotonReaccion({ miReaccion, onClicPrincipal, onElegir, justPopped, compacto }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const timerAbrir = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerCerrar = useRef<ReturnType<typeof setTimeout> | null>(null);
  // true si el toque actual ya se convirtió en "presión larga" (entonces el
  // click sintético que dispara el navegador después del touchend no debe
  // además contar como un clic simple).
  const fuePresionLarga = useRef(false);

  const cancelarTimers = () => {
    if (timerAbrir.current) clearTimeout(timerAbrir.current);
    if (timerCerrar.current) clearTimeout(timerCerrar.current);
  };

  const manejarMouseEnter = () => {
    if (timerCerrar.current) clearTimeout(timerCerrar.current);
    timerAbrir.current = setTimeout(() => setMenuAbierto(true), RETRASO_ABRIR_HOVER);
  };

  const manejarMouseLeave = () => {
    if (timerAbrir.current) clearTimeout(timerAbrir.current);
    timerCerrar.current = setTimeout(() => setMenuAbierto(false), RETRASO_CERRAR);
  };

  const manejarTouchStart = () => {
    fuePresionLarga.current = false;
    timerAbrir.current = setTimeout(() => {
      fuePresionLarga.current = true;
      setMenuAbierto(true);
    }, RETRASO_PRESION_LARGA);
  };

  const manejarTouchEnd = (e: React.TouchEvent) => {
    if (timerAbrir.current) clearTimeout(timerAbrir.current);
    if (fuePresionLarga.current) {
      // Fue mantener presionado: ya se abrió el menú, no disparar también el
      // clic sintético que sigue al touchend.
      e.preventDefault();
    }
  };

  const manejarClicPrincipal = () => {
    cancelarTimers();
    setMenuAbierto(false);
    if (fuePresionLarga.current) {
      fuePresionLarga.current = false;
      return;
    }
    onClicPrincipal();
  };

  const activa = reaccionPorTipo(miReaccion);
  const claseTexto = activa ? activa.clase : "text-slate-400 hover:text-blue-500";
  const tamEmoji = compacto ? 13 : 15;

  return (
    <div className="relative" onMouseEnter={manejarMouseEnter} onMouseLeave={manejarMouseLeave}>
      <button
        type="button"
        onClick={manejarClicPrincipal}
        onTouchStart={manejarTouchStart}
        onTouchEnd={manejarTouchEnd}
        className={`flex items-center gap-1 text-xs font-semibold transition-all duration-200 ${claseTexto} ${miReaccion ? "scale-110" : ""}`}
      >
        <span
          className={`leading-none ${justPopped ? "animate-heart-pop" : ""}`}
          style={{ fontSize: tamEmoji }}
        >
          {activa ? activa.emoji : "👍"}
        </span>
        {activa ? activa.label : "Me gusta"}
      </button>

      {menuAbierto && (
        <div className="absolute z-30 bottom-full mb-1 left-0 flex gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xl px-1.5 py-1">
          {REACCIONES.map((r) => (
            <button
              key={r.tipo}
              type="button"
              onClick={() => {
                cancelarTimers();
                setMenuAbierto(false);
                onElegir(r.tipo);
              }}
              title={r.label}
              className="text-xl leading-none p-1 rounded-full hover:scale-125 hover:bg-slate-50 dark:hover:bg-slate-800 transition-transform"
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
