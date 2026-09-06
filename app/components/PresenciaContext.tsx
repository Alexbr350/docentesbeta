"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../firebase";
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

// Sistema de presencia ("en línea"): cada pestaña abierta con sesión iniciada
// escribe su `ultimaConexion` en presencia/{email} cada ~45s (mientras la
// pestaña esté visible), y CUALQUIER <PuntoEnLinea/> de la app lee ese estado
// de aquí en vez de abrir su propio listener — así, aunque el feed muestre
// 50 avatares a la vez, solo hay UN listener en vivo sobre toda la colección
// `presencia`, no 50.

const DOS_MINUTOS_MS = 2 * 60 * 1000;
const INTERVALO_LATIDO_MS = 45 * 1000; // dentro del rango de 30-60s pedido

type PresenciaContextType = {
  // email -> última conexión, en milisegundos desde epoch.
  presenciaMap: Record<string, number>;
};

const PresenciaContext = createContext<PresenciaContextType>({ presenciaMap: {} });

export function PresenciaProvider({ children }: { children: ReactNode }) {
  const [presenciaMap, setPresenciaMap] = useState<Record<string, number>>({});
  const [, forzarRecalculo] = useState(0);

  // Único listener sobre toda la colección `presencia`.
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "presencia"), (snap) => {
      const mapa: Record<string, number> = {};
      snap.forEach((d) => {
        const ts: any = d.data().ultimaConexion;
        if (ts?.toMillis) mapa[d.id] = ts.toMillis();
      });
      setPresenciaMap(mapa);
    });
    return () => unsubscribe();
  }, []);

  // Un usuario puede "apagarse" (cerrar la pestaña) sin que llegue ningún
  // evento nuevo de Firestore que dispare un re-render — sin este tick, su
  // punto se quedaría verde para siempre hasta el próximo cambio ajeno.
  // Cada 30s forzamos un re-render para que <PuntoEnLinea/> vuelva a
  // comparar contra el reloj actual.
  useEffect(() => {
    const interval = setInterval(() => forzarRecalculo((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Latido: mientras haya sesión iniciada y la pestaña esté visible,
  // actualiza `ultimaConexion` cada ~45s (y de inmediato al iniciar sesión o
  // al volver a la pestaña).
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let emailActual: string | null = null;

    const latir = async () => {
      if (!emailActual || document.visibilityState !== "visible") return;
      try {
        await setDoc(doc(db, "presencia", emailActual), { ultimaConexion: serverTimestamp() }, { merge: true });
      } catch {
        // Si falla un latido (ej. red intermitente) simplemente se reintenta en el siguiente.
      }
    };

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") latir();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      emailActual = user?.email || null;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (!emailActual) return;
      latir();
      intervalId = setInterval(latir, INTERVALO_LATIDO_MS);
    });

    return () => {
      unsubscribeAuth();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return <PresenciaContext.Provider value={{ presenciaMap }}>{children}</PresenciaContext.Provider>;
}

export function usePresencia() {
  return useContext(PresenciaContext);
}

/** True si esa última conexión (en ms) fue hace menos de 2 minutos. */
export function estaEnLinea(ultimaConexionMs?: number): boolean {
  if (!ultimaConexionMs) return false;
  return Date.now() - ultimaConexionMs < DOS_MINUTOS_MS;
}
