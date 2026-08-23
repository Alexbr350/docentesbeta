"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type ModalInputProps = {
  visible: boolean;
  titulo: string;
  placeholder?: string;
  textoConfirmar?: string;
  requerido?: boolean;
  multilinea?: boolean;
  onConfirmar: (texto: string) => void;
  onCancelar: () => void;
};

export default function ModalInput({
  visible,
  titulo,
  placeholder = "",
  textoConfirmar = "Confirmar",
  requerido = true,
  multilinea = false,
  onConfirmar,
  onCancelar,
}: ModalInputProps) {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (visible) setTexto("");
  }, [visible]);

  if (!visible) return null;

  const deshabilitado = requerido && !texto.trim();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{titulo}</h3>
          <button onClick={onCancelar}>
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {multilinea ? (
          <textarea
            autoFocus
            rows={4}
            placeholder={placeholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:border-blue-400"
          />
        ) : (
          <input
            type="text"
            autoFocus
            placeholder={placeholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !deshabilitado) onConfirmar(texto);
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400"
          />
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancelar} className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2">
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(texto)}
            disabled={deshabilitado}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow"
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
