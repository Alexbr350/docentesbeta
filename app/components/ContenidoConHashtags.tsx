"use client";
import { useRouter } from "next/navigation";
import { dividirEnFragmentos } from "../lib/hashtags";

// Reemplazo directo de <p>{post.contenido}</p>: renderiza el mismo texto,
// pero cualquier #hashtag dentro de él queda resaltado y es clicable —
// lleva a /hashtag/[tag]. No requiere que el post tenga guardado el arreglo
// `hashtags`; se calcula sobre la marcha a partir del texto mismo.
export default function ContenidoConHashtags({ texto, className }: { texto?: string; className?: string }) {
  const router = useRouter();
  if (!texto) return null;

  const fragmentos = dividirEnFragmentos(texto);

  return (
    <p className={className}>
      {fragmentos.map((frag, i) =>
        frag.esHashtag ? (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hashtag/${frag.texto.slice(1).toLowerCase()}`);
            }}
            className="text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline"
          >
            {frag.texto}
          </span>
        ) : (
          <span key={i}>{frag.texto}</span>
        )
      )}
    </p>
  );
}
