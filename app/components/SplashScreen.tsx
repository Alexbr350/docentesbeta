"use client";
import { useEffect, useState } from "react";

const DURACION_TOTAL = 1800; // ms visible antes de empezar a desvanecer
const DURACION_FADE_OUT = 400; // ms que dura el fade-out

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [entrada, setEntrada] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntrada(true));
    const textoTimer = setTimeout(() => setMostrarTexto(true), 350);
    const salidaTimer = setTimeout(() => setSaliendo(true), DURACION_TOTAL);
    const finTimer = setTimeout(() => onFinish(), DURACION_TOTAL + DURACION_FADE_OUT);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(textoTimer);
      clearTimeout(salidaTimer);
      clearTimeout(finTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 transition-opacity ease-in-out ${
        saliendo ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${DURACION_FADE_OUT}ms` }}
    >
      <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div
        className={`relative flex flex-col items-center transition-all duration-700 ease-out ${
          entrada ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl mb-5">
          <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-2xl" />
        </div>

        <h1
          className={`text-3xl font-extrabold text-white transition-all duration-500 ease-out ${
            mostrarTexto ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          ENSFA<span className="text-yellow-300">+</span>
        </h1>
        <p
          className={`text-blue-100 text-sm mt-1 transition-opacity duration-500 ease-out ${
            mostrarTexto ? "opacity-100" : "opacity-0"
          }`}
        >
          Tu práctica docente, organizada.
        </p>
      </div>

      <div className="absolute bottom-16 w-40 h-1 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full bg-white rounded-full"
          style={{
            width: entrada ? "100%" : "6%",
            transition: `width ${DURACION_TOTAL - 150}ms ease-out`,
          }}
        ></div>
      </div>
    </div>
  );
}
