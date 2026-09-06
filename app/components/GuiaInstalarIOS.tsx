"use client";
import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";

// Guía para instalar ENSFA+ en iPhone/iPad.
//
// Por qué existe: en Android, Chrome ofrece solo el banner "Instalar app"
// automáticamente (manifest + Service Worker ya lo habilitan). Safari en iOS
// no tiene ese banner — la única forma de "instalar" es que la persona misma
// toque Compartir → Agregar a pantalla de inicio, y no hay forma de detectarlo
// ni activarlo por código. Este banner solo le explica esos dos pasos.
//
// Reglas para que no sea invasivo:
//  - Solo aparece en iOS + Safari real (no en Chrome/Firefox para iOS, que
//    tienen su propio flujo, y no tiene sentido mostrarlo en Android/desktop).
//  - No aparece si la app ya está instalada (modo standalone).
//  - Se cierra con una X y, una vez cerrado, no se vuelve a mostrar en ese
//    dispositivo (se recuerda en localStorage) — no en cada visita.
//  - Aparece con un pequeño retraso, no de golpe al cargar la página.

const CLAVE_CERRADA = "ensfa_guia_ios_cerrada";

function detectarIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const esIphoneOIpad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como "MacIntel" en el userAgent; se distingue de
  // una Mac real porque los iPad tienen pantalla táctil.
  const esIpadComoMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return esIphoneOIpad || esIpadComoMac;
}

function detectarSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // En iOS, Chrome/Firefox/Edge/Opera también usan WebKit pero se identifican
  // con su propio sufijo en el user agent — solo Safari no trae ninguno.
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Mercury/i.test(ua);
}

function detectarYaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneIOS = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const standaloneEstandar = window.matchMedia?.("(display-mode: standalone)").matches;
  return Boolean(standaloneIOS || standaloneEstandar);
}

export default function GuiaInstalarIOS() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE_CERRADA)) return;
    } catch {
      // Si localStorage no está disponible (modo privado, etc.), simplemente no insistimos.
      return;
    }

    if (!detectarIOS() || !detectarSafari() || detectarYaInstalada()) return;

    const temporizador = setTimeout(() => setMostrar(true), 1800);
    return () => clearTimeout(temporizador);
  }, []);

  const cerrar = () => {
    setMostrar(false);
    try {
      localStorage.setItem(CLAVE_CERRADA, "1");
    } catch {
      // Sin localStorage no podemos recordar el cierre, pero al menos se
      // cierra por esta vez.
    }
  };

  if (!mostrar) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-fade-in-up">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 relative">
        <button
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 pr-6 mb-3">
          <img src="/logo.png" alt="ENSFA+" className="w-9 h-9 rounded-full flex-shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">Instala ENSFA+ en tu iPhone</p>
            <p className="text-[11px] text-slate-400">Acceso directo desde tu pantalla de inicio, sin usar el navegador</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Toca <Share size={13} className="inline -mt-0.5 text-blue-600 dark:text-blue-400" /> <span className="font-semibold">Compartir</span> 📤 en la barra de Safari
            </p>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Elige <SquarePlus size={13} className="inline -mt-0.5 text-blue-600 dark:text-blue-400" /> <span className="font-semibold">"Agregar a pantalla de inicio"</span>
            </p>
          </div>
        </div>

        <button
          onClick={cerrar}
          className="w-full mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition rounded-xl py-2"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
