// Configuración y utilidades compartidas del Calendario Escolar
// (app/components/CalendarioEscolar.tsx, app/calendario/page.tsx y la pestaña
// "Calendario" de app/admin/page.tsx) — colección Firestore `calendario_escolar`.
//
// La paleta de los 5 tipos con color (todo menos "otro") fue validada con la
// herramienta de accesibilidad de color del equipo de diseño: los 5 tonos, en
// este orden, superan separación CVD y contraste de marca en modo claro y
// oscuro. "Otro" usa gris neutro a propósito, fuera de la paleta categórica.
// El color nunca es la única señal: en todas partes donde aparece un punto o
// insignia de color, va acompañado del nombre del tipo en texto.

export type TipoEventoCalendario = "practica" | "evento" | "vacacion" | "observacion" | "conferencia" | "otro";

export type EventoCalendario = {
  id: string;
  titulo: string;
  tipo: TipoEventoCalendario;
  fechaInicio: string; // "YYYY-MM-DD"
  fechaFin?: string; // "YYYY-MM-DD", opcional — si no está, es de un solo día
  horaInicio?: string; // "HH:MM"
  horaFin?: string; // "HH:MM"
  descripcion?: string;
  creadoPor?: string;
  // Momento colaborativo: si está activo, los emails en `autorizados` pueden
  // agregar sus Stories al álbum colaborativo del evento (ver
  // app/components/Stories.tsx y app/momento/[eventoId]/page.tsx). Cualquiera
  // puede VER el álbum ya armado; solo los autorizados pueden CONTRIBUIR.
  momentoActivo?: boolean;
  autorizados?: string[];
};

export const TIPOS_EVENTO: {
  valor: TipoEventoCalendario;
  etiqueta: string;
  // Punto/barra sólida — para las marcas del calendario y la leyenda.
  dot: string;
  // Insignia con tinte suave — para las tarjetas del detalle del día y el
  // selector del formulario (fondo + borde; el texto se queda en tinta neutra).
  tinte: string;
  borde: string;
}[] = [
  { valor: "practica", etiqueta: "Práctica", dot: "bg-[#2a78d6] dark:bg-[#3987e5]", tinte: "bg-[#2a78d6]/10 dark:bg-[#3987e5]/15", borde: "border-[#2a78d6]/40 dark:border-[#3987e5]/40" },
  { valor: "evento", etiqueta: "Evento", dot: "bg-[#e87ba4] dark:bg-[#d55181]", tinte: "bg-[#e87ba4]/10 dark:bg-[#d55181]/15", borde: "border-[#e87ba4]/40 dark:border-[#d55181]/40" },
  { valor: "vacacion", etiqueta: "Vacación", dot: "bg-[#008300] dark:bg-[#008300]", tinte: "bg-[#008300]/10 dark:bg-[#008300]/15", borde: "border-[#008300]/40" },
  { valor: "observacion", etiqueta: "Observación", dot: "bg-[#4a3aa7] dark:bg-[#9085e9]", tinte: "bg-[#4a3aa7]/10 dark:bg-[#9085e9]/15", borde: "border-[#4a3aa7]/40 dark:border-[#9085e9]/40" },
  { valor: "conferencia", etiqueta: "Conferencia", dot: "bg-[#eb6834] dark:bg-[#d95926]", tinte: "bg-[#eb6834]/10 dark:bg-[#d95926]/15", borde: "border-[#eb6834]/40 dark:border-[#d95926]/40" },
  { valor: "otro", etiqueta: "Otro", dot: "bg-slate-400 dark:bg-slate-500", tinte: "bg-slate-100 dark:bg-slate-800", borde: "border-slate-300 dark:border-slate-700" },
];

export function configDeTipo(tipo: string) {
  return TIPOS_EVENTO.find((t) => t.valor === tipo) || TIPOS_EVENTO[TIPOS_EVENTO.length - 1];
}

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-08-12" → "12 de agosto de 2026" */
export function formatearFechaLarga(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return `${d} de ${MESES_LARGOS[m - 1]} de ${y}`;
}

/** "14:30" → "2:30 p. m." */
export function formatearHora(hora?: string): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const periodo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${periodo}`;
}

/** Todas las fechas "YYYY-MM-DD" entre inicio y fin (inclusive). Sin fin, solo [inicio]. */
export function expandirRangoFechas(fechaInicio: string, fechaFin?: string): string[] {
  if (!fechaFin || fechaFin <= fechaInicio) return [fechaInicio];
  const dias: string[] = [];
  const cursor = new Date(fechaInicio + "T00:00:00");
  const fin = new Date(fechaFin + "T00:00:00");
  let guard = 0;
  while (cursor <= fin && guard < 366) {
    dias.push(cursor.toISOString().split("T")[0]);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dias;
}

/** Agrupa eventos (posiblemente multi-día) en un mapa fecha → eventos de ese día. */
export function agruparEventosPorDia(eventos: EventoCalendario[]): Map<string, EventoCalendario[]> {
  const mapa = new Map<string, EventoCalendario[]>();
  eventos.forEach((ev) => {
    expandirRangoFechas(ev.fechaInicio, ev.fechaFin).forEach((dia) => {
      const lista = mapa.get(dia) || [];
      lista.push(ev);
      mapa.set(dia, lista);
    });
  });
  return mapa;
}

export function aFechaISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True si el evento tiene su Momento colaborativo activo, es hoy (dentro de
 * su rango de fechas), y el email dado está en su lista de autorizados. */
export function puedeContribuirMomento(evento: EventoCalendario, email: string, hoyISO: string): boolean {
  if (!evento.momentoActivo || !email) return false;
  if (!(evento.autorizados || []).includes(email)) return false;
  return expandirRangoFechas(evento.fechaInicio, evento.fechaFin).includes(hoyISO);
}
