"use client";
import { forwardRef, useRef, useState } from "react";
import { AtSign } from "lucide-react";
import { UsuarioDirectorio } from "../lib/menciones";

// Envuelve un <textarea> o <input> normal para agregarle autocompletado de
// @menciones — se usa en el compositor de publicaciones y en el campo de
// comentarios de app/page.tsx. Reenvía la ref al elemento real de HTML para
// que las demás funciones que ya dependen de esa ref (insertarEnCursor para
// emojis/stickers) sigan funcionando sin cambios.
type Props = {
  tipo?: "textarea" | "input";
  valor: string;
  onCambiar: (v: string) => void;
  directorio: UsuarioDirectorio[];
  placeholder?: string;
  className?: string;
  rows?: number;
  // Si se da (típicamente en el campo de comentarios), Enter sin que el
  // menú de menciones esté abierto dispara esto en vez de escribir salto de línea.
  onEnter?: () => void;
};

const CampoConMenciones = forwardRef<any, Props>(function CampoConMenciones(
  { tipo = "textarea", valor, onCambiar, directorio, placeholder, className, rows, onEnter },
  refExterna
) {
  const refInterna = useRef<any>(null);
  const [mencion, setMencion] = useState<{ inicio: number; query: string } | null>(null);
  const [indiceActivo, setIndiceActivo] = useState(0);

  const asignarRef = (el: any) => {
    refInterna.current = el;
    if (typeof refExterna === "function") refExterna(el);
    else if (refExterna) (refExterna as any).current = el;
  };

  const coincidencias = mencion
    ? directorio.filter((u) => u.nombre?.toLowerCase().includes(mencion.query.toLowerCase())).slice(0, 6)
    : [];

  // Busca hacia atrás desde el cursor el "@" más cercano sin espacios ni
  // saltos de línea entre medio — ese es el trigger activo, si existe.
  const detectarMencion = (texto: string, posicionCursor: number) => {
    const antesDelCursor = texto.slice(0, posicionCursor);
    const arroba = antesDelCursor.lastIndexOf("@");
    if (arroba === -1) return null;
    const fragmento = antesDelCursor.slice(arroba + 1);
    if (/[\s\n]/.test(fragmento)) return null;
    return { inicio: arroba, query: fragmento };
  };

  const manejarCambio = (e: any) => {
    const nuevoTexto = e.target.value;
    onCambiar(nuevoTexto);
    const posicionCursor = e.target.selectionStart ?? nuevoTexto.length;
    setMencion(detectarMencion(nuevoTexto, posicionCursor));
    setIndiceActivo(0);
  };

  const seleccionarMencion = (usuario: UsuarioDirectorio) => {
    if (!mencion) return;
    const el = refInterna.current;
    const posicionCursor = el?.selectionStart ?? valor.length;
    const nuevoValor = valor.slice(0, mencion.inicio) + `@${usuario.nombre} ` + valor.slice(posicionCursor);
    onCambiar(nuevoValor);
    setMencion(null);
    requestAnimationFrame(() => {
      const nuevaPos = mencion.inicio + usuario.nombre.length + 2;
      el?.focus?.();
      el?.setSelectionRange?.(nuevaPos, nuevaPos);
    });
  };

  const manejarKeyDown = (e: React.KeyboardEvent<any>) => {
    if (mencion && coincidencias.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIndiceActivo((i) => (i + 1) % coincidencias.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIndiceActivo((i) => (i - 1 + coincidencias.length) % coincidencias.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); seleccionarMencion(coincidencias[indiceActivo]); return; }
      if (e.key === "Escape") { setMencion(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && onEnter) onEnter();
  };

  return (
    <div className="relative flex-1">
      {tipo === "textarea" ? (
        <textarea
          ref={asignarRef}
          value={valor}
          onChange={manejarCambio}
          onKeyDown={manejarKeyDown}
          placeholder={placeholder}
          className={className}
          rows={rows}
        />
      ) : (
        <input
          ref={asignarRef}
          type="text"
          value={valor}
          onChange={manejarCambio}
          onKeyDown={manejarKeyDown}
          placeholder={placeholder}
          className={className}
        />
      )}
      {mencion && coincidencias.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {coincidencias.map((u, i) => (
            <button
              key={u.email}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); seleccionarMencion(u); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition ${
                i === indiceActivo ? "bg-violet-50 dark:bg-violet-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <AtSign size={13} className="text-violet-500 flex-shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{u.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default CampoConMenciones;
