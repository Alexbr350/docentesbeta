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
