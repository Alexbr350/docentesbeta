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
// nueva estructura en Firestore. Cada slide entra con una revelación
// escalonada (ícono → número → título → subtítulo) y los números grandes
// cuentan hacia arriba desde 0, estilo Spotify Wrapped.

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

/** Número grande que cuenta hacia arriba desde 0 cada vez que se monta (es decir, cada vez que se entra al slide). */
function NumeroGrande({ valor, decimales = 0 }: { valor: number; decimales?: number }) {
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    let frame: number;
    const inicio = performance.now();
    const duracion = 900;
    const animar = (ahora: number) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      const facilitado = 1 - Math.pow(1 - progreso, 3);
      setMostrado(valor * facilitado);
      if (progreso < 1) frame = requestAnimationFrame(animar);
      else setMostrado(valor);
    };
    frame = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return <>{mostrado.toFixed(decimales)}</>;
}

/** Ráfaga de confetti para los slides más celebratorios (mismo idioma visual que Insignias.tsx). */
function ConfettiWrapped() {
  const [particulas] = useState(() => {
    const colores = ["#ffffff", "#fde68a", "#f9a8d4", "#93c5fd", "#c4b5fd"];
    return Array.from({ length: 22 }, (_, i) => {
      const angulo = (i / 22) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const distancia = 70 + Math.random() * 80;
      return {
        id: i,
        tx: Math.cos(angulo) * distancia,
        ty: Math.sin(angulo) * distancia,
        tr: Math.random() * 360 - 180,
        color: colores[i % colores.length],
        delay: Math.random() * 200,
      };
    });
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
      {particulas.map((p) => (
        <span
          key={p.id}
          className="absolute w-2 h-2 rounded-sm animate-confetti"
          style={
            {
              backgroundColor: p.color,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--tr": `${p.tr}deg`,
              animationDelay: `${p.delay}ms`,
              animationDuration: "1.1s",
            } as any
          }
        />
      ))}
    </div>
  );
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

  // Revelación escalonada: cada elemento entra con un pequeño retraso extra
  // respecto al anterior (ícono → número → título → subtítulo), fade-in +
  // desplazamiento vertical + una leve "aparición" de escala en el número.
  const entraCon = (retrasoMs: number, conEscala = false) => ({
    className: `transition-all duration-500 ease-out ${
      entrada ? `opacity-100 translate-y-0 ${conEscala ? "scale-100" : ""}` : `opacity-0 translate-y-3 ${conEscala ? "scale-75" : ""}`
    }`,
    style: { transitionDelay: entrada ? `${retrasoMs}ms` : "0ms" },
  });

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br ${FONDOS[slideActual]} transition-colors duration-500`}>
      <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      {(slideActual === 4 || slideActual === 7) && entrada && <ConfettiWrapped />}

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

      <div key={slideActual} className="max-w-md w-full px-8 relative z-10 text-center">
        {slideActual === 0 && (
          <>
            <div {...entraCon(0, true)}>
              <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-2xl mx-auto mb-6 opacity-90" />
            </div>
            <div {...entraCon(120)}>
              <p className="text-white/80 text-sm font-semibold uppercase tracking-wide mb-2">Tu semestre en ENSFA+</p>
            </div>
            <div {...entraCon(260)}>
              <h1 className="text-4xl font-extrabold text-white leading-tight break-words">{nombreCompleto}</h1>
            </div>
            {fechaInicio && (
              <div {...entraCon(400)}>
                <p className="text-white/70 text-sm mt-4">Contigo desde el {formatearFecha(fechaInicio)}</p>
              </div>
            )}
            <div {...entraCon(550)}>
              <p className="text-white/60 text-xs mt-8">Toca para continuar →</p>
            </div>
          </>
        )}

        {slideActual === 1 && (
          <>
            <div {...entraCon(0)}>
              <BookOpen size={36} className="text-white/80 mx-auto mb-4" />
            </div>
            <div {...entraCon(150, true)}>
              <p className="text-7xl font-extrabold text-white">
                <NumeroGrande valor={posts.length} />
              </p>
            </div>
            <div {...entraCon(320)}>
              <p className="text-white text-lg font-bold mt-3">{posts.length === 1 ? "publicación" : "publicaciones"}</p>
            </div>
            <div {...entraCon(460)}>
              <p className="text-white/70 text-sm mt-2">
                Escribiste {posts.length} {posts.length === 1 ? "publicación" : "publicaciones"} este semestre
              </p>
            </div>
          </>
        )}

        {slideActual === 2 && (
          <>
            <div {...entraCon(0)}>
              <Flame size={36} className="text-white fill-white mx-auto mb-4" />
            </div>
            <div {...entraCon(150, true)}>
              <p className="text-7xl font-extrabold text-white">
                <NumeroGrande valor={rachaMasLarga} />
              </p>
            </div>
            <div {...entraCon(320)}>
              <p className="text-white text-lg font-bold mt-3">{rachaMasLarga === 1 ? "día" : "días"} seguidos</p>
            </div>
            <div {...entraCon(460)}>
              <p className="text-white/70 text-sm mt-2">
                {rachaMasLarga > 0
                  ? "Esa fue tu racha más larga alcanzada. ¡Así se construye el hábito!"
                  : "Este semestre es tu oportunidad de empezar una racha."}
              </p>
            </div>
          </>
        )}

        {slideActual === 3 && (
          <>
            <div {...entraCon(0)}>
              <Star size={36} className="text-white mx-auto mb-4" fill="currentColor" />
            </div>
            {cantidadCalificados > 0 ? (
              <>
                <div {...entraCon(150, true)}>
                  <p className="text-7xl font-extrabold text-white">
                    <NumeroGrande valor={promedio} decimales={1} />
                  </p>
                </div>
                <div {...entraCon(320)}>
                  <p className="text-white text-lg font-bold mt-3">de calificación promedio</p>
                </div>
                <div {...entraCon(460)}>
                  <p className="text-white/70 text-sm mt-2">
                    Basado en {cantidadCalificados} {cantidadCalificados === 1 ? "publicación calificada" : "publicaciones calificadas"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div {...entraCon(150)}>
                  <p className="text-2xl font-extrabold text-white mt-2">Aún sin calificaciones</p>
                </div>
                <div {...entraCon(320)}>
                  <p className="text-white/70 text-sm mt-2">Todavía no tienes publicaciones calificadas por tu maestro.</p>
                </div>
              </>
            )}
          </>
        )}

        {slideActual === 4 && (
          <>
            <div {...entraCon(0)}>
              <Award size={36} className="text-white mx-auto mb-4" />
            </div>
            <div {...entraCon(150, true)}>
              <p className="text-7xl font-extrabold text-white">
                <NumeroGrande valor={insigniasDesbloqueadas.length} />
              </p>
            </div>
            <div {...entraCon(320)}>
              <p className="text-white text-lg font-bold mt-3">
                {insigniasDesbloqueadas.length === 1 ? "insignia desbloqueada" : "insignias desbloqueadas"}
              </p>
            </div>
            {insigniasRecientes.length > 0 && (
              <div {...entraCon(500)} className={`${entraCon(500).className} flex items-center justify-center gap-3 mt-6`}>
                {insigniasRecientes.map((ins, i) => {
                  const Icono = ins.icono;
                  return (
                    <div
                      key={ins.id}
                      title={ins.nombre}
                      className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110"
                      style={{ transitionDelay: `${600 + i * 80}ms` }}
                    >
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
            <div {...entraCon(0)}>
              <Heart size={36} className="text-white fill-white mx-auto mb-4" />
            </div>
            <div {...entraCon(150, true)}>
              <p className="text-7xl font-extrabold text-white">
                {totalLikes === null ? <span className="animate-pulse">···</span> : <NumeroGrande valor={totalLikes} />}
              </p>
            </div>
            <div {...entraCon(320)}>
              <p className="text-white text-lg font-bold mt-3">{totalLikes === 1 ? "like recibido" : "likes recibidos"}</p>
            </div>
            <div {...entraCon(460)}>
              <p className="text-white/70 text-sm mt-2">En todas tus publicaciones de este semestre</p>
            </div>
          </>
        )}

        {slideActual === 6 && (
          <>
            {frecuente ? (
              <>
                <div {...entraCon(0)}>
                  {(() => {
                    const IconoFrecuente = ICONOS_TIPO[frecuente.tipo] || BookOpen;
                    return <IconoFrecuente size={36} className="text-white mx-auto mb-4" />;
                  })()}
                </div>
                <div {...entraCon(150, true)}>
                  <p className="text-4xl font-extrabold text-white">{frecuente.tipo}</p>
                </div>
                <div {...entraCon(320)}>
                  <p className="text-white text-lg font-bold mt-3">tu tipo de publicación favorito</p>
                </div>
                <div {...entraCon(460)}>
                  <p className="text-white/70 text-sm mt-2">
                    {frecuente.cantidad} de tus publicaciones fueron de este tipo
                  </p>
                </div>
              </>
            ) : (
              <div {...entraCon(0)}>
                <p className="text-2xl font-extrabold text-white">Aún no tienes publicaciones</p>
              </div>
            )}
          </>
        )}

        {slideActual === 7 && (
          <>
            <div {...entraCon(0, true)}>
              <img src="/logo.png" alt="ENSFA" className="w-20 h-20 rounded-2xl mx-auto mb-6" />
            </div>
            <div {...entraCon(180)}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles size={22} className="text-yellow-300" />
                <h1 className="text-3xl font-extrabold text-white">¡Gran semestre, {nombre}!</h1>
                <Sparkles size={22} className="text-yellow-300" />
              </div>
            </div>
            <div {...entraCon(360)}>
              <p className="text-white/80 text-sm">
                Sigue construyendo tu práctica docente, publicación tras publicación. ENSFA+ está contigo en cada paso.
              </p>
            </div>
            <div {...entraCon(540)}>
              <button
                onClick={onClose}
                className="mt-8 bg-white text-slate-900 font-bold text-sm px-6 py-3 rounded-xl shadow-xl hover:bg-white/90 transition active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
