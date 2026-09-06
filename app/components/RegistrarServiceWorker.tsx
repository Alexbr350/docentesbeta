"use client";
import { useEffect } from "react";

// Registra el Service Worker (public/sw.js) apenas carga la app. No renderiza
// nada — solo dispara el registro una vez en el cliente. Sin esto, aunque
// exista manifest.json + sw.js, Chrome no ofrece el banner de instalación
// porque nunca hay un Service Worker activo controlando la página.
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("No se pudo registrar el Service Worker:", err);
    });
  }, []);

  return null;
}
