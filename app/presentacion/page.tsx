"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ShieldAlert, Users2, ClipboardList, Star, TrendingUp, ChevronLeft, ChevronRight, X, Maximize, Minimize, Trophy } from "lucide-react";
import { ADMINS } from "../lib/admins";
import Spinner from "../components/Spinner";

const DURACION_SLIDE = 9000; // ms entre slides en auto-avance
const TOTAL_SLIDES = 6;

// Paleta categórica validada para fondo oscuro (identidad por tipo/practicante)
const COLORES_TIPO = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
// Rampa secuencial de un solo tono (azul), ordinal 1→10, clara→oscura
const COLORES_CALIFICACION = ["#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95"];

const estiloTooltip = { background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#fff", fontSize: 13 };

type Destacado = { nombre: string; cantidad: number } | null;

export default function Presentacion() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [slideActual, setSlideActual] = useState(0);
  const [autoAvance, setAutoAvance] = useState(true);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) {
        router.push("/landing");
        return;
      }
      if (!ADMINS.includes(u.email || "")) {
        setAccesoDenegado(true);
        setLoading(false);
        return;
      }
      setLoading(false);
      cargarDatos();
    });
    return () => unsubscribe();
  }, [router]);

  const cargarDatos = async () => {
    const q = query(collection(db, "posts"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const data: any[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPosts(data);
    const emails = [...new Set(data.map((p: any) => p.email))];
    const usuariosData = emails.map((email) => ({
      email,
      nombre: data.find((p: any) => p.email === email)?.autor || email,
      publicaciones: data.filter((p: any) => p.email === email).length,
    }));
    setUsuarios(usuariosData);
  };

  const irSiguiente = useCallback(() => {
    setSlideActual((prev) => (prev + 1) % TOTAL_SLIDES);
  }, []);

  const irAnterior = useCallback(() => {
    setSlideActual((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
  }, []);

  // Auto-avance: se reinicia cada vez que cambia el slide (manual o automático)
  useEffect(() => {
    if (!autoAvance) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => irSiguiente(), DURACION_SLIDE);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slideActual, autoAvance, irSiguiente]);

  useEffect(() => {
    const onFsChange = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") irSiguiente();
      if (e.key === "ArrowLeft") irAnterior();
      if (e.key === " ") {
        e.preventDefault();
        setAutoAvance((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [irSiguiente, irAnterior]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // El navegador puede bloquear pantalla completa; se ignora silenciosamente
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 animate-fade-in">
        <div className="text-center">
          <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
          <Spinner tamano={24} texto="Cargando modo presentación..." />
        </div>
      </div>
    );
  }

  if (accesoDenegado) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 animate-fade-in">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-10 text-center max-w-sm shadow-2xl animate-modal-pop">
          <ShieldAlert size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-extrabold text-white mb-2">Acceso denegado</h2>
          <p className="text-sm text-slate-400 mb-6">No tienes permisos para ver esta página.</p>
          <button onClick={() => router.push("/")} className="text-sm bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);
  const postsEstaSemana = posts.filter((p) => {
    const f = p.fecha?.toDate?.();
    return f && f >= hace7dias;
  });

  const postsCalificados = posts.filter((p) => p.calificacion);
  const promedioCalificacion =
    postsCalificados.length > 0
      ? postsCalificados.reduce((sum, p) => sum + (p.calificacion || 0), 0) / postsCalificados.length
      : 0;

  const datosPorTipo = ["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"].map((tipo) => ({
    tipo,
    cantidad: posts.filter((p) => p.tipo === tipo).length,
  }));

  const datosCalificaciones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .map((n, i) => ({
      nota: n.toString(),
      cantidad: posts.filter((p) => p.calificacion === n).length,
      color: COLORES_CALIFICACION[i],
    }))
    .filter((d) => d.cantidad > 0);

  const ultimos7dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (6 - i));
    const fechaStr = fecha.toLocaleDateString("es-MX", { weekday: "short" });
    const postsDelDia = posts.filter((p) => {
      const postFecha = p.fecha?.toDate?.();
      if (!postFecha) return false;
      return postFecha.toDateString() === fecha.toDateString();
    });
    return { dia: fechaStr, publicaciones: postsDelDia.length };
  });

  const publicacionesPorUsuario = usuarios
    .map((u) => ({ nombre: u.nombre?.split(" ")[0] || u.email, publicaciones: u.publicaciones }))
    .sort((a, b) => b.publicaciones - a.publicaciones)
    .slice(0, 5);

  const conteosSemana: Record<string, Destacado> = {};
  postsEstaSemana.forEach((p) => {
    const actual = conteosSemana[p.email];
    conteosSemana[p.email] = { nombre: p.autor, cantidad: (actual?.cantidad || 0) + 1 };
  });
  let destacado: Destacado =
    Object.values(conteosSemana).sort((a, b) => (b?.cantidad || 0) - (a?.cantidad || 0))[0] || null;
  if (!destacado && publicacionesPorUsuario.length > 0) {
    destacado = { nombre: publicacionesPorUsuario[0].nombre, cantidad: publicacionesPorUsuario[0].publicaciones };
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 overflow-hidden select-none">
      <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-[32rem] h-[32rem] bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-[32rem] h-[32rem] bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      <button
        onClick={() => router.push("/admin")}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-30 flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 md:px-4 md:py-2 rounded-xl transition backdrop-blur-sm active:scale-95"
      >
        <X size={16} /> Salir
      </button>

      <button
        onClick={toggleFullscreen}
        className="absolute top-4 left-4 md:top-6 md:left-6 z-30 flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 md:px-4 md:py-2 rounded-xl transition backdrop-blur-sm active:scale-95"
      >
        {pantallaCompleta ? <Minimize size={16} /> : <Maximize size={16} />}
        <span className="hidden sm:inline">{pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}</span>
      </button>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-5 sm:px-8 md:px-16 py-16">
        <div key={slideActual} className="w-full max-w-6xl animate-fade-in">
          {slideActual === 0 && (
            <SlideHero
              totalPracticantes={usuarios.length}
              totalPublicaciones={posts.length}
              publicacionesSemana={postsEstaSemana.length}
              promedioCalificacion={promedioCalificacion}
            />
          )}
          {slideActual === 1 && <SlideChartTipo datos={datosPorTipo} />}
          {slideActual === 2 && <SlideChartCalificaciones datos={datosCalificaciones} />}
          {slideActual === 3 && <SlideChartActividad datos={ultimos7dias} />}
          {slideActual === 4 && <SlideChartTop datos={publicacionesPorUsuario} />}
          {slideActual === 5 && <SlideDestacado destacado={destacado} />}
        </div>
      </div>

      <button
        onClick={irAnterior}
        aria-label="Slide anterior"
        className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-14 md:h-14 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition backdrop-blur-sm active:scale-95"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={irSiguiente}
        aria-label="Siguiente slide"
        className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-14 md:h-14 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition backdrop-blur-sm active:scale-95"
      >
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 md:gap-2.5">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideActual(i)}
            aria-label={`Ir al slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === slideActual ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/50"}`}
          />
        ))}
      </div>

      <button
        onClick={() => setAutoAvance((v) => !v)}
        className="absolute bottom-6 md:bottom-8 right-4 md:right-8 z-30 text-[11px] md:text-xs text-white/40 hover:text-white/70 transition font-medium"
      >
        {autoAvance ? "● Auto" : "○ Pausado"}
      </button>
    </div>
  );
}

function SlideHero({
  totalPracticantes,
  totalPublicaciones,
  publicacionesSemana,
  promedioCalificacion,
}: {
  totalPracticantes: number;
  totalPublicaciones: number;
  publicacionesSemana: number;
  promedioCalificacion: number;
}) {
  return (
    <div className="text-center">
      <div className="flex flex-col items-center mb-10 md:mb-14">
        <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl mb-6">
          <img src="/logo.png" alt="ENSFA" className="w-14 h-14 md:w-20 md:h-20 rounded-2xl" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
          ENSFA<span className="text-blue-400">+</span>
        </h1>
        <p className="text-blue-200/70 text-base md:text-lg mt-2 font-medium">Panel de resultados en tiempo real</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { valor: totalPracticantes, label: "Practicantes", icon: Users2, color: "text-blue-400" },
          { valor: totalPublicaciones, label: "Publicaciones totales", icon: ClipboardList, color: "text-indigo-300" },
          { valor: publicacionesSemana, label: "Esta semana", icon: TrendingUp, color: "text-emerald-300" },
          { valor: promedioCalificacion.toFixed(1), label: "Calificación promedio", icon: Star, color: "text-amber-300" },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl">
            <s.icon size={26} className={`mx-auto mb-3 ${s.color}`} />
            <div className="text-3xl md:text-6xl font-black text-white tabular-nums">{s.valor}</div>
            <div className="text-[10px] md:text-sm text-white/50 mt-2 font-semibold uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideChartTipo({ datos }: { datos: { tipo: string; cantidad: number }[] }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
      <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-1 text-center">Publicaciones por tipo</h2>
      <p className="text-white/40 text-sm md:text-base text-center mb-6 md:mb-8">Distribución de contenido publicado en la plataforma</p>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={datos} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="tipo" tick={{ fontSize: 13, fill: "rgba(255,255,255,0.65)" }} axisLine={{ stroke: "rgba(255,255,255,0.15)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={estiloTooltip} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar dataKey="cantidad" radius={[10, 10, 0, 0]} maxBarSize={90}>
            {datos.map((_, i) => (
              <Cell key={i} fill={COLORES_TIPO[i % COLORES_TIPO.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SlideChartCalificaciones({ datos }: { datos: { nota: string; cantidad: number; color: string }[] }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
      <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-1 text-center">Distribución de calificaciones</h2>
      <p className="text-white/40 text-sm md:text-base text-center mb-6 md:mb-8">Publicaciones evaluadas por el equipo docente, del 1 al 10</p>
      {datos.length === 0 ? (
        <p className="text-white/40 text-center py-20">Aún no hay publicaciones calificadas.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={datos} dataKey="cantidad" nameKey="nota" cx="50%" cy="50%" innerRadius={70} outerRadius={150} paddingAngle={3}>
                {datos.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="#0f172a" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={estiloTooltip} formatter={(value: any, _name: any, props: any) => [`${value} publicaciones`, `Calificación ${props.payload.nota}`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-4 md:mt-6">
            {datos.map((d) => (
              <div key={d.nota} className="flex items-center gap-1.5 text-xs md:text-sm text-white/70 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }}></span>
                {d.nota}/10 · {d.cantidad}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SlideChartActividad({ datos }: { datos: { dia: string; publicaciones: number }[] }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
      <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-1 text-center">Actividad de los últimos 7 días</h2>
      <p className="text-white/40 text-sm md:text-base text-center mb-6 md:mb-8">Publicaciones creadas por día en la última semana</p>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={datos} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 13, fill: "rgba(255,255,255,0.65)" }} axisLine={{ stroke: "rgba(255,255,255,0.15)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={estiloTooltip} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
          <Line type="monotone" dataKey="publicaciones" stroke="#3987e5" strokeWidth={4} dot={{ fill: "#3987e5", r: 6, strokeWidth: 2, stroke: "#0f172a" }} activeDot={{ r: 9 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SlideChartTop({ datos }: { datos: { nombre: string; publicaciones: number }[] }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
      <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-1 text-center">Top 5 practicantes más activos</h2>
      <p className="text-white/40 text-sm md:text-base text-center mb-6 md:mb-8">Ranking por total de publicaciones</p>
      {datos.length === 0 ? (
        <p className="text-white/40 text-center py-20">Aún no hay publicaciones.</p>
      ) : (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={datos} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} allowDecimals={false} axisLine={false} tickLine={false} />
            <YAxis dataKey="nombre" type="category" tick={{ fontSize: 14, fill: "rgba(255,255,255,0.8)", fontWeight: 700 }} width={120} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={estiloTooltip} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="publicaciones" radius={[0, 10, 10, 0]} maxBarSize={44}>
              {datos.map((_, i) => (
                <Cell key={i} fill={COLORES_TIPO[i % COLORES_TIPO.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SlideDestacado({ destacado }: { destacado: Destacado }) {
  return (
    <div className="text-center">
      <p className="text-blue-300/70 text-sm md:text-lg font-bold uppercase tracking-[0.2em] mb-6 md:mb-8 flex items-center justify-center gap-2">
        <Trophy size={20} className="text-amber-300" /> Practicante destacado de la semana
      </p>
      {destacado ? (
        <>
          <div className="w-24 h-24 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-4xl md:text-7xl font-black mx-auto mb-8 shadow-2xl shadow-amber-500/30">
            {destacado.nombre?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-7xl font-black text-white tracking-tight mb-4 break-words px-2">{destacado.nombre}</h2>
          <p className="text-lg md:text-2xl text-blue-200/70 font-semibold">
            {destacado.cantidad} publicaci{destacado.cantidad === 1 ? "ón" : "ones"} esta semana
          </p>
        </>
      ) : (
        <p className="text-white/40 text-xl mt-10">Aún no hay publicaciones esta semana.</p>
      )}
    </div>
  );
}
