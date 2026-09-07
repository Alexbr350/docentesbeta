// Utilidades para menciones (@NombreCompleto) en publicaciones y comentarios
// — mismo patrón que app/lib/hashtags.ts (extraerHashtags / dividirEnFragmentos),
// pero con una diferencia importante: un hashtag es una sola palabra sin
// espacios, mientras que un nombre de practicante puede tener espacios
// ("Ana Pérez"). Por eso, en vez de una sola expresión regular, una mención
// se resuelve contra un directorio de nombres conocidos (los mismos
// practicantes que ya se listan en otras partes de la app) — así, al
// seleccionar del autocompletado, se inserta el nombre completo real y se
// puede reconocer sin ambigüedad al extraer/resaltar.

export type UsuarioDirectorio = { email: string; nombre: string };

/** Busca, justo en `desde`, el nombre conocido más largo que calce ahí (evita que un nombre corto quede atrapado dentro de uno más largo, ej. "Ana" dentro de "Ana Pérez"). */
function nombreEnPosicion(texto: string, desde: number, directorioOrdenado: UsuarioDirectorio[]): UsuarioDirectorio | null {
  for (const u of directorioOrdenado) {
    const nombre = u.nombre;
    if (!nombre) continue;
    const candidato = texto.slice(desde, desde + nombre.length);
    if (candidato.length < nombre.length) continue;
    if (candidato.toLowerCase() !== nombre.toLowerCase()) continue;
    const siguiente = texto[desde + nombre.length];
    // Debe terminar en límite de palabra (que no siga con más letras/números).
    if (siguiente && /[a-zA-Z0-9À-ÖØ-öø-ÿ_]/.test(siguiente)) continue;
    return u;
  }
  return null;
}

export type FragmentoMencion = { texto: string; esMencion: boolean; usuario?: UsuarioDirectorio };

/** Divide un texto en fragmentos alternando texto normal y menciones reconocidas del directorio. */
export function dividirEnFragmentosMenciones(texto: string, directorio: UsuarioDirectorio[]): FragmentoMencion[] {
  if (!texto) return [];
  if (!directorio || directorio.length === 0) return [{ texto, esMencion: false }];

  // Los nombres más largos se prueban primero (ver nombreEnPosicion).
  const directorioOrdenado = [...directorio].sort((a, b) => (b.nombre?.length || 0) - (a.nombre?.length || 0));

  const partes: FragmentoMencion[] = [];
  let ultimoIndice = 0;
  let i = 0;
  while (i < texto.length) {
    if (texto[i] === "@") {
      const usuario = nombreEnPosicion(texto, i + 1, directorioOrdenado);
      if (usuario) {
        if (i > ultimoIndice) partes.push({ texto: texto.slice(ultimoIndice, i), esMencion: false });
        const mencionTexto = "@" + usuario.nombre;
        partes.push({ texto: mencionTexto, esMencion: true, usuario });
        i += mencionTexto.length;
        ultimoIndice = i;
        continue;
      }
    }
    i++;
  }
  if (ultimoIndice < texto.length) partes.push({ texto: texto.slice(ultimoIndice), esMencion: false });
  return partes;
}

/** Extrae los emails de los usuarios mencionados en un texto (reconocidos contra el directorio), sin duplicados. */
export function extraerMenciones(texto: string, directorio: UsuarioDirectorio[]): string[] {
  if (!texto || !directorio || directorio.length === 0) return [];
  const fragmentos = dividirEnFragmentosMenciones(texto, directorio);
  const emails = fragmentos.filter((f) => f.esMencion && f.usuario).map((f) => f.usuario!.email);
  return [...new Set(emails)];
}
