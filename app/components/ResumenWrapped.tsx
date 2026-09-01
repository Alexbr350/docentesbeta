"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardList,
  PenLine,
  Paperclip,
  HelpCircle,
  Flame,
  Star,
  Heart,
  Award,
  Sparkles,
} from "lucide-react";
import { calcularRachaMasLarga } from "../lib/racha";
import { calcularInsignias } from "./Insignias";

// Resumen "Wrapped" del semestre: experiencia de tarjetas a pantalla completa
// (mismo patrón de navegación que Stories.tsx: tercios izq/der para
// retroceder/avanzar, barra de progreso arriba, botón cerrar) que muestra
// estadísticas de actividad del practicante calculadas en el cliente, sin
// nueva estructura en Firestore.

const TOTAL_SLIDES = 8;

const FONDOS = [
  "from-blue-600 via-indigo-600 to-purple-600",
  "from-indigo-600 via-blue-600 to-cyan-600",
  "from-orange-500 via-red-500 to-pink-500",
  "from-emerald-600 via-teal-600 to-cyan-600",
  "from-amber-500 via-yellow-500 to-orange-500",
  "from-pink-600 via-rose-500 to-red-500",
  "from-purple-600 via-violet-600 to-indigo-600",
  "from-blue-700 via-blue-600 to-indigo-700",
];

const ICONOS_TIPO: Record<string, any> = {
  "Diario": BookOpen,
  "Planeación": ClipboardList,
  "Narrativa": PenLine,
  "Extra": Paperclip,
  "Pedir ayuda": HelpCircle,
};

function tipoMasFrecuente(posts: any[]): { tipo: string; cantidad: number } | null {
  const conteo: Record<string, number> = {};
  posts.forEach((p) => {
    if (p.tipo) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  });
  const entradas = Object.entries(conteo);
  if (entradas.length === 0) return null;
  entradas.sort((a, b) => b[1] - a[1]);
  return { tipo: entradas[0][0], cantidad: entradas[0][1] };
}

function promedioCalificacion(posts: any[]): { promedio: number; cantidad: number } {
  const calificados = posts.filter((p) => typeof p.calificacion === "number");
  if (calificados.length === 0) return { promedio: 0, cantidad: 0 };
  const suma = calificados.reduce((acc, p) => acc + p.calificacion, 0);
  return { promedio: suma / calificados.length, cantidad: calificados.length };
}

function obtenerFechaInicio(user: any, posts: any[]): Date | null {
  const creacion = user?.metadata?.creationTime;
  if (creacion) {
    const f = new Date(creacion);
    if (!isNaN(f.getTime())) return f;
  }
  const fechas = posts
    .map((p) => p.fecha?.toDate?.())
    .filter((f): f is Date => !!f)
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  return fechas[0] || null;
}

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export default function ResumenWrapped({
  visible,
  onClose,
  posts,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  posts: any[];
  user: any;
}) {
  const [slideActual, setSlideActual] = useState(0);
  const [entrada, setEntrada] = useState(false);
  const [totalLikes, setTotalLikes] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSlideActual(0);
    setTotalLikes(null);
    let cancelado = false;
    (async () => {
      const conteos = await Promise.all(
        posts.map(async (p) => {
          try {
            const snap = await getDocs(collection(db, "posts", p.id, "likes"));
            return snap.docs.length;
          } catch {
            return 0;
          }
        })
      );
      if (!cancelado) setTotalLikes(conteos.reduce((a, b) => a + b, 0));
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setEntrada(false);
    const raf = requestAnimationFrame(() => setEntrada(true));
    return () => cancelAnimationFrame(raf);
  }, [slideActual, visible]);

  if (!visible) return null;

  const siguiente = () => {
    if (slideActual < TOTAL_SLIDES - 1) setSlideActual((s) => s + 1);
    else onClose();
  };
  const anterior = () => {
    if (slideActual > 0) setSlideActual((s) => s - 1);
  };

  const nombre = user?.displayName?.split(" ")[0] || "Practicante";
  const nombreCompleto = user?.displayName || "Practicante";
  const fechaInicio = obtenerFechaInicio(user, posts);
  const rachaMasLarga = calcularRachaMasLarga(posts, user?.email || "");
  const { promedio, cantidad: cantidadCalificados } = promedioCalificacion(posts);
  const insignias = calcularInsignias(posts, user?.email || "");
  const insigniasDesbloqueadas = insignias.filter((i) => i.desbloqueada);
  const insigniasRecientes = insigniasDesbloqueadas.slice(-3);
  const frecuente = tipoMasFrecuente(posts);

  const animClase = `transition-all duration-700 ease-out ${entrada ? "opacity-100 scale-100" : "opacity-0 scale-75"}`;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br ${FONDOS[slideActual]} transition-colors duration-500`}>
      <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: i <= slideActual ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <button onClick={onClose} className="absolute top-8 right-4 text-white z-20 p-2" aria-label="Cerrar">
        <X size={28} />
      </button>

      <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={anterior}></div>
      <div className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={siguiente}></div>

      {slideActual > 0 && (
        <button
          onClick={anterior}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm items-center justify-center text-white transition"
          aria-label="Anterior"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <button
        onClick={siguiente}
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm items-center justify-center text-white transition"
        aria-label="Siguiente"
      >
        <ChevronRight size={22} />
      </button>

      <div className="max-w-md w-full px-8 relative z-10 text-center">
        <div className={animClase}>
          {slideActual === 0 && (
            <>
              <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-2xl mx-auto mb-6 opacity-90" />
              <p className="text-white/80 text-sm font-semibold uppercase tracking-wide mb-2">Tu semestre en ENSFA+</p>
              <h1 className="text-4xl font-extrabold text-white leading-tight break-words">{nombreCompleto}</h1>
              {fechaInicio && (
                <p className="text-white/70 text-sm mt-4">
                  Contigo desde el {formatearFecha(fechaInicio)}
                </p>
              )}
              <p className="text-white/60 text-xs mt-8">Toca para continuar →</p>
            </>
          )}

          {slideActual === 1 && (
            <>
              <BookOpen size={36} className="text-white/80 mx-auto mb-4" />
              <p className="text-7xl font-extrabold text-white">{posts.length}</p>
              <p className="text-white text-lg font-bold mt-3">
                {posts.length === 1 ? "publicación" : "publicaciones"}
              </p>
              <p className="text-white/70 text-sm mt-2">
                Escribiste {posts.length} {posts.length === 1 ? "publicación" : "publicaciones"} este semestre
              </p>
            </>
          )}

          {slideActual === 2 && (
            <>
              <Flame size={36} className="text-white fill-white mx-auto mb-4" />
              <p className="text-7xl font-extrabold text-white">{rachaMasLarga}</p>
              <p className="text-white text-lg font-bold mt-3">{rachaMasLarga === 1 ? "día" : "días"} seguidos</p>
              <p className="text-white/70 text-sm mt-2">
                {rachaMasLarga > 0
                  ? "Esa fue tu racha más larga alcanzada. ¡Así se construye el hábito!"
                  : "Este semestre es tu oportunidad de empezar una racha."}
              </p>
            </>
          )}

          {slideActual === 3 && (
            <>
              <Star size={36} className="text-white mx-auto mb-4" fill="currentColor" />
              {cantidadCalificados > 0 ? (
                <>
                  <p className="text-7xl font-extrabold text-white">{promedio.toFixed(1)}</p>
                  <p className="text-white text-lg font-bold mt-3">de calificación promedio</p>
                  <p className="text-white/70 text-sm mt-2">
                    Basado en {cantidadCalificados} {cantidadCalificados === 1 ? "publicación calificada" : "publicaciones calificadas"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-white mt-2">Aún sin calificaciones</p>
                  <p className="text-white/70 text-sm mt-2">Todavía no tienes publicaciones calificadas por tu maestro.</p>
                </>
              )}
            </>
          )}

          {slideActual === 4 && (
            <>
              <Award size={36} className="text-white mx-auto mb-4" />
              <p className="text-7xl font-extrabold text-white">{insigniasDesbloqueadas.length}</p>
              <p className="text-white text-lg font-bold mt-3">
                {insigniasDesbloqueadas.length === 1 ? "insignia desbloqueada" : "insignias desbloqueadas"}
              </p>
              {insigniasRecientes.length > 0 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  {insigniasRecientes.map((ins) => {
                    const Icono = ins.icono;
                    return (
                      <div key={ins.id} title={ins.nombre} className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                        <Icono size={24} className="text-white" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {slideActual === 5 && (
            <>
              <Heart size={36} className="text-white fill-white mx-auto mb-4" />
              <p className="text-7xl font-extrabold text-white">
                {totalLikes === null ? <span className="animate-pulse">···</span> : totalLikes}
              </p>
              <p className="text-white text-lg font-bold mt-3">
                {totalLikes === 1 ? "like recibido" : "likes recibidos"}
              </p>
              <p className="text-white/70 text-sm mt-2">En todas tus publicaciones de este semestre</p>
            </>
          )}

          {slideActual === 6 && (
            <>
              {frecuente ? (
                <>
                  {(() => {
                    const IconoFrecuente = ICONOS_TIPO[frecuente.tipo] || BookOpen;
                    return <IconoFrecuente size={36} className="text-white mx-auto mb-4" />;
                  })()}
                  <p className="text-4xl font-extrabold text-white">{frecuente.tipo}</p>
                  <p className="text-white text-lg font-bold mt-3">tu tipo de publicación favorito</p>
                  <p className="text-white/70 text-sm mt-2">
                    {frecuente.cantidad} de tus publicaciones fueron de este tipo
                  </p>
                </>
              ) : (
                <p className="text-2xl font-extrabold text-white">Aún no tienes publicaciones</p>
              )}
            </>
          )}

          {slideActual === 7 && (
            <>
              <img src="/logo.png" alt="ENSFA" className="w-20 h-20 rounded-2xl mx-auto mb-6" />
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles size={22} className="text-yellow-300" />
                <h1 className="text-3xl font-extrabold text-white">¡Gran semestre, {nombre}!</h1>
                <Sparkles size={22} className="text-yellow-300" />
              </div>
              <p className="text-white/80 text-sm">
                Sigue construyendo tu práctica docente, publicación tras publicación. ENSFA+ está contigo en cada paso.
              </p>
              <button
                onClick={onClose}
                className="mt-8 bg-white text-slate-900 font-bold text-sm px-6 py-3 rounded-xl shadow-xl hover:bg-white/90 transition active:scale-95"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
