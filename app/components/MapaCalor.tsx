"use client";
import { Calendar } from "lucide-react";

// Mapa de calor de actividad estilo GitHub: una cuadrícula de días (columnas =
// semanas, filas = día de la semana) coloreada según cuántas publicaciones hizo
// el practicante ese día, cubriendo los últimos ~6 meses.

const DIAS_VENTANA = 180; // ~6 meses hacia atrás desde hoy
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Escala de intensidad (0 = sin publicaciones, 3 = 4 o más). Los 3 pasos
// azules (blue-400/600/800) están validados como rampa ordinal de un solo
// tono, con el ancla invertida en modo oscuro para mantener el contraste.
const NIVEL_COLORES = [
  "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60",
  "bg-blue-400 dark:bg-blue-800",
  "bg-blue-600 dark:bg-blue-600",
  "bg-blue-800 dark:bg-blue-400",
];

function nivelDe(cantidad: number): number {
  if (cantidad <= 0) return 0;
  if (cantidad === 1) return 1;
  if (cantidad <= 3) return 2;
  return 3;
}

function formatearFecha(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES_LARGOS[fecha.getMonth()]}`;
}

type DiaHeatmap = { fecha: Date; cantidad: number } | null;

export default function MapaCalor({ posts, email }: { posts: any[]; email?: string }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - DIAS_VENTANA);
  inicio.setDate(inicio.getDate() - inicio.getDay()); // alinear al domingo anterior

  const conteoPorDia = new Map<string, number>();
  posts.forEach((p: any) => {
    if (email && p.email !== email) return;
    const f = p.fecha?.toDate?.();
    if (!f) return;
    const clave = f.toDateString();
    conteoPorDia.set(clave, (conteoPorDia.get(clave) || 0) + 1);
  });

  const dias: { fecha: Date; cantidad: number }[] = [];
  const cursor = new Date(inicio);
  while (cursor <= hoy) {
    dias.push({ fecha: new Date(cursor), cantidad: conteoPorDia.get(cursor.toDateString()) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Agrupar en semanas (columnas) de 7 días; la última semana se rellena con
  // celdas vacías (null) si aún no llega a "hoy" en sábado.
  const semanas: DiaHeatmap[][] = [];
  for (let i = 0; i < dias.length; i += 7) {
    semanas.push(dias.slice(i, i + 7));
  }
  const ultima = semanas[semanas.length - 1];
  if (ultima && ultima.length < 7) {
    semanas[semanas.length - 1] = [...ultima, ...Array(7 - ultima.length).fill(null)];
  }

  let mesAnterior = -1;
  const etiquetasMes = semanas.map((semana) => {
    const primerDia = semana[0];
    if (!primerDia) return "";
    const mes = primerDia.fecha.getMonth();
    if (mes !== mesAnterior) {
      mesAnterior = mes;
      return MESES_CORTOS[mes];
    }
    return "";
  });

  const totalVentana = dias.reduce((acc, d) => acc + d.cantidad, 0);

  let rachaMasLarga = 0;
  let rachaActual = 0;
  dias.forEach((d) => {
    if (d.cantidad > 0) {
      rachaActual += 1;
      rachaMasLarga = Math.max(rachaMasLarga, rachaActual);
    } else {
      rachaActual = 0;
    }
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md">
      <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
        <Calendar size={16} className="text-blue-600" /> Actividad
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        {totalVentana} {totalVentana === 1 ? "publicación" : "publicaciones"} en los últimos 6 meses · Racha más larga: {rachaMasLarga} {rachaMasLarga === 1 ? "día" : "días"}
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px] min-w-max">
          <div className="flex flex-col gap-[3px] mr-1 pt-[15px]">
            {DIAS_SEMANA.map((d, i) => (
              <div key={d} className="h-[11px] flex items-center">
                {(i === 1 || i === 3 || i === 5) && (
                  <span className="text-[9px] text-slate-400 leading-none">{d}</span>
                )}
              </div>
            ))}
          </div>

          {semanas.map((semana, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              <div className="h-[12px] mb-[3px] text-[9px] text-slate-400 leading-none whitespace-nowrap">
                {etiquetasMes[wi]}
              </div>
              {semana.map((dia, di) =>
                dia ? (
                  <div
                    key={di}
                    title={`${formatearFecha(dia.fecha)}: ${dia.cantidad} ${dia.cantidad === 1 ? "publicación" : "publicaciones"}`}
                    className={`w-[11px] h-[11px] rounded-sm ${NIVEL_COLORES[nivelDe(dia.cantidad)]}`}
                  />
                ) : (
                  <div key={di} className="w-[11px] h-[11px]" />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-slate-400">Menos</span>
        {NIVEL_COLORES.map((c, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-slate-400">Más</span>
      </div>
    </div>
  );
}
