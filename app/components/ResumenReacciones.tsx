"use client";
import { useState } from "react";
import { ConteoReacciones, reaccionesOrdenadas, reaccionPorTipo, totalReacciones } from "../lib/reacciones";

// Resumen visual de las reacciones de una publicación/comentario: los 2-3
// emojis más usados superpuestos + el conteo total, y al pasar el mouse (o
// tocar, en móvil) se muestra el desglose completo ("5 Me gusta, 3 Me
// encanta, 1 Me divierte"). No renderiza nada si no hay reacciones aún.
export default function ResumenReacciones({ conteo, compacto }: { conteo?: ConteoReacciones; compacto?: boolean }) {
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const ordenadas = reaccionesOrdenadas(conteo);
  const total = totalReacciones(conteo);

  if (total === 0) return null;

  const top = ordenadas.slice(0, 3);
  const tamCirculo = compacto ? "w-3.5 h-3.5 text-[9px]" : "w-4 h-4 text-[10px]";

  return (
    <div
      className="relative inline-flex items-center gap-1 cursor-default"
      onMouseEnter={() => setMostrarDesglose(true)}
      onMouseLeave={() => setMostrarDesglose(false)}
      onClick={() => setMostrarDesglose((v) => !v)}
    >
      <span className="flex items-center -space-x-1.5">
        {top.map((r, i) => (
          <span
            key={r.tipo}
            className={`${tamCirculo} rounded-full bg-white dark:bg-slate-900 border border-white dark:border-slate-900 flex items-center justify-center shadow-sm`}
            style={{ zIndex: top.length - i }}
          >
            {reaccionPorTipo(r.tipo)?.emoji}
          </span>
        ))}
      </span>
      <span className="text-xs text-slate-400 font-medium">{total}</span>

      {mostrarDesglose && (
        <div className="absolute z-30 bottom-full mb-1 left-0 bg-slate-900 dark:bg-slate-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
          {ordenadas.map((r) => `${r.cantidad} ${reaccionPorTipo(r.tipo)?.label}`).join(", ")}
        </div>
      )}
    </div>
  );
}
