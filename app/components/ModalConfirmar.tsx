"use client";
import { AlertTriangle, HelpCircle } from "lucide-react";

type ModalConfirmarProps = {
  visible: boolean;
  titulo?: string;
  mensaje: string;
  destructivo?: boolean;
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export default function ModalConfirmar({
  visible,
  titulo,
  mensaje,
  destructivo = false,
  textoConfirmar,
  onConfirmar,
  onCancelar,
}: ModalConfirmarProps) {
  if (!visible) return null;

  const tituloFinal = titulo || (destructivo ? "Eliminar" : "Confirmar acción");
  const botonTexto = textoConfirmar || (destructivo ? "Eliminar" : "Confirmar");
  const Icono = destructivo ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            destructivo ? "bg-red-100 dark:bg-red-950/40" : "bg-blue-100 dark:bg-blue-950/40"
          }`}
        >
          <Icono size={22} className={destructivo ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"} />
        </div>
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-1.5">{tituloFinal}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{mensaje}</p>

        <div className="flex justify-center gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl font-semibold transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className={`flex-1 text-sm text-white px-4 py-2.5 rounded-xl font-semibold shadow transition ${
              destructivo ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {botonTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
