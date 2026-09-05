"use client";
import { useEffect, useState } from "react";
import { X, CalendarDays } from "lucide-react";
import { EventoCalendario, TipoEventoCalendario, TIPOS_EVENTO } from "../lib/calendarioEscolar";

export type DatosFormularioCalendario = {
  titulo: string;
  tipo: TipoEventoCalendario;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string;
};

export default function ModalCalendarioEvento({
  visible,
  eventoEditar,
  fechaSugerida,
  onGuardar,
  onCancelar,
}: {
  visible: boolean;
  eventoEditar?: EventoCalendario | null;
  fechaSugerida?: string | null;
  onGuardar: (datos: DatosFormularioCalendario) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEventoCalendario>("practica");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (eventoEditar) {
      setTitulo(eventoEditar.titulo || "");
      setTipo(eventoEditar.tipo || "practica");
      setFechaInicio(eventoEditar.fechaInicio || "");
      setFechaFin(eventoEditar.fechaFin || "");
      setHoraInicio(eventoEditar.horaInicio || "");
      setHoraFin(eventoEditar.horaFin || "");
      setDescripcion(eventoEditar.descripcion || "");
    } else {
      setTitulo("");
      setTipo("practica");
      setFechaInicio(fechaSugerida || "");
      setFechaFin("");
      setHoraInicio("");
      setHoraFin("");
      setDescripcion("");
    }
  }, [visible, eventoEditar, fechaSugerida]);

  if (!visible) return null;

  const esEdicion = !!eventoEditar;
  const deshabilitado = !titulo.trim() || !fechaInicio;

  const guardar = () => {
    if (deshabilitado) return;
    onGuardar({ titulo: titulo.trim(), tipo, fechaInicio, fechaFin, horaInicio, horaFin, descripcion: descripcion.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-modal-pop">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
            <CalendarDays size={16} className="text-blue-600" /> {esEdicion ? "Editar fecha" : "Nueva fecha"}
          </h3>
          <button onClick={onCancelar} className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>

        <input
          type="text"
          autoFocus
          placeholder="Título (ej. Prácticas docentes)"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mb-3 focus:outline-none focus:border-blue-400"
        />

        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Tipo</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {TIPOS_EVENTO.map((t) => {
            const activo = tipo === t.valor;
            return (
              <button
                key={t.valor}
                type="button"
                onClick={() => setTipo(t.valor)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                  activo ? `${t.tinte} ${t.borde} text-slate-700 dark:text-slate-200` : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.dot}`} />
                {t.etiqueta}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Fecha inicio</p>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Fecha fin (opcional)</p>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Hora inicio (opcional)</p>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Hora fin (opcional)</p>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <textarea
          placeholder="Descripción (opcional)..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 resize-none mb-4 focus:outline-none focus:border-blue-400"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 px-4 py-2">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={deshabilitado}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
          >
            {esEdicion ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
