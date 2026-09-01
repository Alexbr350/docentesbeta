// Registro de auditoría de acciones administrativas — colección Firestore
// `audit_log`. Se usa desde varias partes de app/admin/page.tsx cada vez que
// un admin hace una acción sensible (eliminar publicación, certificar a un
// practicante, etc.) y se muestra en la pestaña "Auditoría" del panel.

import { BadgeCheck, CalendarDays, CalendarX, Flag, GraduationCap, ScrollText, Trash2, LucideIcon } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export type TipoAccionAuditoria =
  | "post_eliminado"
  | "reporte_revisado"
  | "maestro_agregado"
  | "certificacion"
  | "calendario_creado"
  | "calendario_eliminado";

export type EntradaAuditoria = {
  id: string;
  tipo: TipoAccionAuditoria | string;
  accion: string;
  realizadoPor: string;
  detalles?: Record<string, any>;
  fecha?: any;
};

export const INFO_ACCION_AUDITORIA: Record<string, { icono: LucideIcon; color: string; fondo: string; etiqueta: string }> = {
  post_eliminado: { icono: Trash2, color: "text-red-600 dark:text-red-400", fondo: "bg-red-100 dark:bg-red-950/40", etiqueta: "Publicación eliminada" },
  reporte_revisado: { icono: Flag, color: "text-orange-600 dark:text-orange-400", fondo: "bg-orange-100 dark:bg-orange-950/40", etiqueta: "Reporte revisado" },
  maestro_agregado: { icono: GraduationCap, color: "text-blue-600 dark:text-blue-400", fondo: "bg-blue-100 dark:bg-blue-950/40", etiqueta: "Maestro agregado" },
  certificacion: { icono: BadgeCheck, color: "text-emerald-600 dark:text-emerald-400", fondo: "bg-emerald-100 dark:bg-emerald-950/40", etiqueta: "Certificación" },
  calendario_creado: { icono: CalendarDays, color: "text-indigo-600 dark:text-indigo-400", fondo: "bg-indigo-100 dark:bg-indigo-950/40", etiqueta: "Fecha de calendario creada" },
  calendario_eliminado: { icono: CalendarX, color: "text-slate-500 dark:text-slate-400", fondo: "bg-slate-100 dark:bg-slate-800", etiqueta: "Fecha de calendario eliminada" },
};

export const INFO_ACCION_DEFAULT = { icono: ScrollText, color: "text-slate-500 dark:text-slate-400", fondo: "bg-slate-100 dark:bg-slate-800", etiqueta: "Acción" };

/**
 * Registra una acción administrativa en `audit_log`. Nunca lanza: si falla
 * el registro, solo se reporta en consola — la auditoría es un efecto
 * secundario y no debe bloquear ni revertir la acción real ya ejecutada.
 */
export async function registrarAuditoria(
  tipo: TipoAccionAuditoria,
  accion: string,
  realizadoPor: string,
  detalles?: Record<string, any>
) {
  try {
    await addDoc(collection(db, "audit_log"), {
      tipo,
      accion,
      realizadoPor: realizadoPor || "desconocido",
      detalles: detalles || {},
      fecha: serverTimestamp(),
    });
  } catch (error) {
    console.error("No se pudo registrar en el log de auditoría:", error);
  }
}
