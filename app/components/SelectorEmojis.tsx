"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Smile } from "lucide-react";
import type { EmojiClickData, Theme } from "emoji-picker-react";

// El selector de emojis usa APIs del navegador (mide el layout, maneja
// focus, etc.), así que se carga solo en el cliente: con ssr:false evitamos
// que Next.js intente renderizarlo en el servidor.
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type ElementoConCursor = HTMLInputElement | HTMLTextAreaElement;

type SelectorEmojisProps = {
  /** Valor actual del input/textarea donde se va a insertar el emoji. */
  valor: string;
  /** Se llama con el nuevo valor ya con el emoji insertado en la posición del cursor. */
  onCambiar: (nuevoValor: string) => void;
  /** Devuelve el elemento (input o textarea) real en el DOM. Se llama en cada inserción,
   *  así que funciona incluso con refs dinámicas (por ejemplo, un input distinto por cada
   *  publicación en una lista). */
  obtenerElemento: () => ElementoConCursor | null;
  /** Clases Tailwind para posicionar el panel flotante respecto al botón (que ya es
   *  position: relative). Por defecto se abre arriba, alineado a la izquierda del botón. */
  posicionPanel?: string;
  anchoPanel?: number;
  altoPanel?: number;
  /** Texto opcional junto al ícono, para botones de toolbar con etiqueta (ej. el compositor). */
  etiqueta?: string;
  tamanoIcono?: number;
  /** Permite adaptar el estilo del botón al contexto donde se use; recibe si el panel está abierto. */
  claseBoton?: (activo: boolean) => string;
};

const claseBotonPorDefecto = (activo: boolean) =>
  `flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95 ${
    activo ? "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
  }`;

export default function SelectorEmojis({
  valor,
  onCambiar,
  obtenerElemento,
  posicionPanel = "bottom-full mb-2 left-0",
  anchoPanel = 280,
  altoPanel = 340,
  etiqueta,
  tamanoIcono = 18,
  claseBoton = claseBotonPorDefecto,
}: SelectorEmojisProps) {
  const [mostrar, setMostrar] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setModoOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  // Cierra el panel si se hace clic fuera de él.
  useEffect(() => {
    if (!mostrar) return;
    const alHacerClicFuera = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMostrar(false);
      }
    };
    document.addEventListener("mousedown", alHacerClicFuera);
    return () => document.removeEventListener("mousedown", alHacerClicFuera);
  }, [mostrar]);

  // Inserta el emoji elegido justo donde está el cursor (no solo al final),
  // y deja el cursor justo después de insertarlo.
  const insertarEmoji = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const el = obtenerElemento();
    if (!el) {
      onCambiar(valor + emoji);
      return;
    }
    const inicio = el.selectionStart ?? valor.length;
    const fin = el.selectionEnd ?? valor.length;
    const nuevoValor = valor.slice(0, inicio) + emoji + valor.slice(fin);
    onCambiar(nuevoValor);
    requestAnimationFrame(() => {
      const nuevaPos = inicio + emoji.length;
      el.focus();
      el.setSelectionRange(nuevaPos, nuevaPos);
    });
  };

  return (
    <div className="relative inline-block">
      {mostrar && (
        <div ref={panelRef} className={`absolute z-50 shadow-2xl rounded-xl overflow-hidden ${posicionPanel}`}>
          <EmojiPicker
            onEmojiClick={insertarEmoji}
            theme={(modoOscuro ? "dark" : "light") as Theme}
            width={anchoPanel}
            height={altoPanel}
            previewConfig={{ showPreview: false }}
            searchPlaceHolder="Buscar emoji..."
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setMostrar((v) => !v)}
        aria-label="Insertar emoji"
        className={claseBoton(mostrar)}
      >
        <Smile size={tamanoIcono} />
        {etiqueta && <span>{etiqueta}</span>}
      </button>
    </div>
  );
}
