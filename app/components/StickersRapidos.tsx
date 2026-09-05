"use client";

// Reacciones rápidas predefinidas: emojis grandes con fondo de color que se
// pueden usar con un solo toque. Se decidió por esta opción en vez de la API
// de GIPHY porque, aunque GIPHY tiene una capa gratuita, requiere registrar
// una app y obtener una clave nueva (con límite de 100 llamadas/hora) —
// estas reacciones no necesitan ninguna clave ni servicio externo.
//
// Compartido entre el chat (ChatBubble.tsx, donde un toque ENVÍA el sticker
// directo) y el compositor/comentarios en app/page.tsx (donde un toque lo
// INSERTA en el texto donde está el cursor, igual que el selector de
// emojis) — el componente no decide qué hacer con el sticker, solo avisa
// cuál se tocó vía onSeleccionar.
export const STICKERS_RAPIDOS: { emoji: string; etiqueta: string; color: string }[] = [
  { emoji: "👍", etiqueta: "Genial", color: "bg-blue-500" },
  { emoji: "❤️", etiqueta: "Me encanta", color: "bg-rose-500" },
  { emoji: "😂", etiqueta: "Jaja", color: "bg-amber-500" },
  { emoji: "👏", etiqueta: "Bien hecho", color: "bg-emerald-500" },
  { emoji: "🎉", etiqueta: "Felicidades", color: "bg-purple-500" },
  { emoji: "🤔", etiqueta: "Interesante", color: "bg-slate-500" },
];

export default function StickersRapidos({
  onSeleccionar,
  tamano = "w-10 h-10 text-xl",
}: {
  onSeleccionar: (sticker: string) => void;
  /** Clases Tailwind de tamaño/tipografía de cada botón — permite reusarlo más chico donde haga falta. */
  tamano?: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {STICKERS_RAPIDOS.map((s) => (
        <button
          key={s.etiqueta}
          type="button"
          onClick={() => onSeleccionar(s.emoji)}
          title={s.etiqueta}
          className={`flex-shrink-0 ${tamano} rounded-full ${s.color} flex items-center justify-center shadow-sm hover:shadow-md transition active:scale-90`}
        >
          {s.emoji}
        </button>
      ))}
    </div>
  );
}
