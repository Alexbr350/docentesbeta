"use client";
import { usePresencia, estaEnLinea } from "./PresenciaContext";

// Punto verde de "en línea" para poner en la esquina de un avatar — el
// contenedor del avatar debe tener `position: relative` para que quede bien
// ubicado. No abre ningún listener propio: lee del mapa compartido de
// PresenciaContext, así que mostrar muchos a la vez (una lista completa de
// usuarios) sigue costando una sola lectura en vivo de Firestore.
export default function PuntoEnLinea({
  email,
  tamano = 10,
  posicion = "absolute -bottom-0.5 -right-0.5",
}: {
  email?: string | null;
  /** Diámetro del punto en píxeles. */
  tamano?: number;
  /** Clases de posicionamiento respecto al contenedor `relative` del avatar. */
  posicion?: string;
}) {
  const { presenciaMap } = usePresencia();

  if (!email || !estaEnLinea(presenciaMap[email])) return null;

  return (
    <span
      className={`${posicion} flex z-10`}
      style={{ width: tamano, height: tamano }}
      title="En línea"
      aria-label="En línea"
    >
      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
      <span
        className="relative inline-flex rounded-full bg-green-500 border-2 border-white dark:border-slate-900"
        style={{ width: tamano, height: tamano }}
      />
    </span>
  );
}
