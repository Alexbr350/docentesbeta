// Cálculo de "racha" (días consecutivos publicando), estilo Duolingo.
// Se usa en app/page.tsx (sidebar del feed), app/perfil/page.tsx (tarjeta
// destacada) y app/components/Insignias.tsx (insignias de racha), para no
// duplicar la lógica en cada archivo.

export const HITOS_RACHA = [3, 7, 14, 30];

/**
 * Cuenta los días consecutivos (hacia atrás desde hoy) en los que `email`
 * publicó al menos una vez. Si no publicó hoy, la racha sigue viva mientras
 * haya publicado ayer; si no publicó ni hoy ni ayer, la racha es 0.
 */
export function calcularRacha(posts: any[], email: string): number {
  if (!email) return 0;

  const fechasUnicas = new Set<string>();
  posts.forEach((p: any) => {
    if (p.email !== email) return;
    const f = p.fecha?.toDate?.();
    if (!f) return;
    fechasUnicas.add(f.toDateString());
  });

  if (fechasUnicas.size === 0) return 0;

  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);

  let cursor: Date;
  if (fechasUnicas.has(hoy.toDateString())) {
    cursor = hoy;
  } else if (fechasUnicas.has(ayer.toDateString())) {
    cursor = ayer;
  } else {
    return 0;
  }

  let racha = 0;
  while (fechasUnicas.has(cursor.toDateString())) {
    racha += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

/** El próximo hito (3, 7, 14, 30) que el usuario aún no alcanza, o null si ya superó todos. */
export function proximoHitoRacha(racha: number): number | null {
  return HITOS_RACHA.find((h) => h > racha) ?? null;
}

/**
 * Racha más larga (histórica) que `email` alcanzó alguna vez, a diferencia de
 * calcularRacha() que solo mide la racha activa contando hacia atrás desde
 * hoy. Recorre todo el historial de publicaciones (sin ventana de tiempo) y
 * busca la secuencia de días consecutivos más larga. Se usa en el resumen
 * "Wrapped" del semestre (app/components/ResumenWrapped.tsx).
 */
export function calcularRachaMasLarga(posts: any[], email: string): number {
  if (!email) return 0;

  const diasUnicos = new Set<number>();
  posts.forEach((p: any) => {
    if (p.email !== email) return;
    const f = p.fecha?.toDate?.();
    if (!f) return;
    const dia = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    diasUnicos.add(dia.getTime());
  });

  if (diasUnicos.size === 0) return 0;

  const dias = Array.from(diasUnicos).sort((a, b) => a - b);
  const unDia = 24 * 60 * 60 * 1000;

  let masLarga = 1;
  let actual = 1;
  for (let i = 1; i < dias.length; i++) {
    if (dias[i] - dias[i - 1] === unDia) {
      actual += 1;
      masLarga = Math.max(masLarga, actual);
    } else {
      actual = 1;
    }
  }
  return masLarga;
}
