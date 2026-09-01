// Lógica compartida del certificado de finalización con aprobación del
// evaluador — usada en la pestaña "Practicantes" de app/admin/page.tsx (para
// saber a quién mostrarle el botón "Certificar finalización") y en
// app/perfil/page.tsx (para saber qué mostrar: progreso normal, mensaje de
// "esperando certificación", o el certificado ya listo para descargar).
//
// La certificación se guarda en la colección `certificaciones`, con el email
// del practicante como ID de documento (evita certificaciones duplicadas y
// permite un getDoc directo).

// Mismas metas que ya se calculan en app/perfil/page.tsx y
// app/components/Insignias.tsx (insignia "Todas las metas") — se repiten
// aquí como fuente única para la lógica de certificación.
export const METAS_CERTIFICACION: Record<string, number> = {
  "Diario": 10,
  "Planeación": 5,
  "Narrativa": 1,
  "Extra": 3,
};

export type Certificacion = {
  email: string;
  nombre: string;
  fechaCertificacion?: any; // Firestore Timestamp
  certificadoPor: string;
  comentario?: string;
  folio: string;
};

/** ¿El practicante ya completó el 100% de sus metas principales? */
export function metasCompletadas(posts: any[], email: string): boolean {
  if (!email) return false;
  const propios = posts.filter((p: any) => p.email === email);
  return Object.entries(METAS_CERTIFICACION).every(
    ([tipo, meta]) => propios.filter((p: any) => p.tipo === tipo).length >= meta
  );
}

/** Folio único legible, ej. "ENSFA-2026-M3F7K2". No requiere contador en Firestore. */
export function generarFolio(): string {
  const anio = new Date().getFullYear();
  const codigo = Date.now().toString(36).toUpperCase();
  return `ENSFA-${anio}-${codigo}`;
}
