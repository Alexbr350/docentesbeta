// Utilidades compartidas para hashtags (#etiqueta) en las publicaciones —
// usadas por el compositor (app/page.tsx), el renderizado del contenido
// (app/components/ContenidoConHashtags.tsx) y la página de exploración
// (app/hashtag/[tag]/page.tsx).

// Incluye letras acentuadas y "ñ" a propósito (ej. "#matemáticas",
// "#español"), ya que el contenido de la plataforma es en español.
const REGEX_HASHTAG = /#([a-zA-Z0-9À-ÖØ-öø-ÿ_]+)/g;

/** Extrae los hashtags de un texto, en minúsculas y sin el "#", sin duplicados. */
export function extraerHashtags(texto?: string): string[] {
  if (!texto) return [];
  const encontrados = texto.match(REGEX_HASHTAG) || [];
  const normalizados = encontrados.map((h) => h.slice(1).toLowerCase());
  return [...new Set(normalizados)];
}

export type FragmentoContenido = { texto: string; esHashtag: boolean };

/** Divide un texto en fragmentos alternando texto normal y hashtags, para poder darles estilo distinto al renderizar. */
export function dividirEnFragmentos(texto?: string): FragmentoContenido[] {
  if (!texto) return [];
  const partes: FragmentoContenido[] = [];
  // Se crea una instancia nueva del regex (misma fuente) para no compartir el
  // estado de `lastIndex` entre llamadas — REGEX_HASHTAG es global y se
  // reutiliza en extraerHashtags() vía .match(), que sí es seguro, pero aquí
  // usamos .exec() en un ciclo, que si depende de ese estado.
  const regex = new RegExp(REGEX_HASHTAG.source, "g");
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      partes.push({ texto: texto.slice(ultimoIndice, match.index), esHashtag: false });
    }
    partes.push({ texto: match[0], esHashtag: true });
    ultimoIndice = match.index + match[0].length;
  }
  if (ultimoIndice < texto.length) {
    partes.push({ texto: texto.slice(ultimoIndice), esHashtag: false });
  }
  return partes;
}
