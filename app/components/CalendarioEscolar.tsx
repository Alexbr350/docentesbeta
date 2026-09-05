"use client";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X, Edit, Trash2, Plus } from "lucide-react";
import {
  EventoCalendario,
  TIPOS_EVENTO,
  configDeTipo,
  agruparEventosPorDia,
  formatearFechaLarga,
  formatearHora,
  aFechaISO,
} from "../lib/calendarioEscolar";

const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"];

export default function CalendarioEscolar({
  eventos,
  modoEdicion = false,
  onCrear,
  onEditar,
  onEliminar,
}: {
  eventos: EventoCalendario[];
  modoEdicion?: boolean;
  onCrear?: (fechaSugerida: string) => void;
  onEditar?: (evento: EventoCalendario) => void;
  onEliminar?: (evento: EventoCalendario) => void;
}) {
  const hoyDate = new Date();
  const [mesActual, setMesActual] = useState(new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const eventosPorDia = useMemo(() => agruparEventosPorDia(eventos), [eventos]);
  const hoy = aFechaISO(hoyDate);

  const nombreMes = mesActual.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const diasEnMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate();
  const offsetInicial = primerDiaMes.getDay();

  const celdas: (string | null)[] = [
    ...Array(offsetInicial).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => aFechaISO(new Date(mesActual.getFullYear(), mesActual.getMonth(), i + 1))),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  const irMesAnterior = () => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1));
  const irMesSiguiente = () => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1));
  const irHoy = () => setMesActual(new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1));

  const eventosDia = diaSeleccionado ? eventosPorDia.get(diaSeleccionado) || [] : [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 capitalize flex items-center gap-1.5">
          <CalendarDays size={16} className="text-blue-600" /> {nombreMes}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={irHoy}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition mr-1"
          >
            Hoy
          </button>
          <button onClick={irMesAnterior} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition" aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <button onClick={irMesSiguiente} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition" aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div key={nombreMes} className="grid grid-cols-7 gap-1 animate-fade-in">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`vacio-${i}`} />;
          const eventosDelDia = eventosPorDia.get(dia) || [];
          const tiposUnicos = [...new Set(eventosDelDia.map((e) => e.tipo))];
          const esHoy = dia === hoy;
          return (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition ${
                esHoy
                  ? "bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-400 font-bold text-blue-700 dark:text-blue-400"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <span>{Number(dia.split("-")[2])}</span>
              {tiposUnicos.length > 0 && (
                <div className="flex gap-0.5">
                  {tiposUnicos.slice(0, 3).map((t) => (
                    <span key={t} className={`w-1.5 h-1.5 rounded-full ${configDeTipo(t).dot}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {TIPOS_EVENTO.map((t) => (
          <span key={t.valor} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.dot}`} /> {t.etiqueta}
          </span>
        ))}
      </div>

      {diaSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{formatearFechaLarga(diaSeleccionado)}</h3>
              <button onClick={() => setDiaSeleccionado(null)} className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                <X size={18} />
              </button>
            </div>

            {eventosDia.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No hay nada programado este día.</p>
            )}

            {eventosDia.map((ev) => {
              const cfg = configDeTipo(ev.tipo);
              return (
                <div key={ev.id} className={`rounded-xl p-3 mb-2 border ${cfg.tinte} ${cfg.borde}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{cfg.etiqueta}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100 break-words">{ev.titulo}</p>
                  {(ev.horaInicio || ev.horaFin) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatearHora(ev.horaInicio)}
                      {ev.horaInicio && ev.horaFin ? " – " : ""}
                      {formatearHora(ev.horaFin)}
                    </p>
                  )}
                  {ev.fechaFin && ev.fechaFin !== ev.fechaInicio && (
                    <p className="text-xs text-slate-400 mt-0.5">Hasta {formatearFechaLarga(ev.fechaFin)}</p>
                  )}
                  {ev.descripcion && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed break-words">{ev.descripcion}</p>
                  )}
                  {modoEdicion && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-slate-900/10 dark:border-white/10">
                      <button
                        onClick={() => onEditar?.(ev)}
                        className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition"
                      >
                        <Edit size={12} /> Editar
                      </button>
                      <button
                        onClick={() => onEliminar?.(ev)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {modoEdicion && (
              <button
                onClick={() => onCrear?.(diaSeleccionado)}
                className="w-full flex items-center justify-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow transition active:scale-95 mt-2"
              >
                <Plus size={14} /> Agregar a este día
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
