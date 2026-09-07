"use client";
import { useRouter } from "next/navigation";
import { dividirEnFragmentos } from "../lib/hashtags";
import { dividirEnFragmentosMenciones, UsuarioDirectorio } from "../lib/menciones";

// Reemplazo directo de <p>{post.contenido}</p>: renderiza el mismo texto,
// pero cualquier #hashtag dentro de él queda resaltado y es clicable (lleva
// a /hashtag/[tag]), y si se pasa un `directorio`, cualquier @Mención
// reconocida contra ese directorio también queda resaltada (en un color
// distinto, para diferenciarla del hashtag) y lleva al perfil de esa
// persona. No requiere que el post tenga guardados los arreglos `hashtags`/
// `menciones`; ambos se recalculan sobre la marcha a partir del texto.
export default function ContenidoConHashtags({
  texto,
  className,
  directorio,
}: {
  texto?: string;
  className?: string;
  directorio?: UsuarioDirectorio[];
}) {
  const router = useRouter();
  if (!texto) return null;

  const fragmentosHashtag = dividirEnFragmentos(texto);

  return (
    <p className={className}>
      {fragmentosHashtag.map((frag, i) => {
        if (frag.esHashtag) {
          return (
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
          );
        }

        // El texto que no es hashtag puede seguir teniendo @menciones —
        // nunca al revés, porque un fragmento "#hashtag" nunca contiene "@".
        const subfragmentos = directorio && directorio.length > 0
          ? dividirEnFragmentosMenciones(frag.texto, directorio)
          : [{ texto: frag.texto, esMencion: false as const }];

        return (
          <span key={i}>
            {subfragmentos.map((sub, j) =>
              sub.esMencion && sub.usuario ? (
                <span
                  key={j}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/usuarios?resaltar=${encodeURIComponent(sub.usuario!.email)}`);
                  }}
                  className="text-violet-600 dark:text-violet-400 font-bold cursor-pointer hover:underline"
                >
                  {sub.texto}
                </span>
              ) : (
                <span key={j}>{sub.texto}</span>
              )
            )}
          </span>
        );
      })}
    </p>
  );
}
