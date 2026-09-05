// Inserta texto (un emoji, un sticker, lo que sea) en un input/textarea justo
// donde está el cursor, en vez de solo agregarlo al final — y deja el cursor
// justo después de lo insertado. Lo usan SelectorEmojis.tsx y
// StickersRapidos.tsx para no duplicar esta lógica en cada lugar donde se
// insertan (compositor de publicaciones, comentarios, chat).

export type ElementoConCursor = HTMLInputElement | HTMLTextAreaElement;

export function insertarEnCursor(
  valorActual: string,
  elemento: ElementoConCursor | null,
  textoAInsertar: string,
  actualizar: (nuevoValor: string) => void
) {
  if (!elemento) {
    actualizar(valorActual + textoAInsertar);
    return;
  }
  const inicio = elemento.selectionStart ?? valorActual.length;
  const fin = elemento.selectionEnd ?? valorActual.length;
  const nuevoValor = valorActual.slice(0, inicio) + textoAInsertar + valorActual.slice(fin);
  actualizar(nuevoValor);
  requestAnimationFrame(() => {
    const nuevaPos = inicio + textoAInsertar.length;
    elemento.focus();
    elemento.setSelectionRange(nuevaPos, nuevaPos);
  });
}
