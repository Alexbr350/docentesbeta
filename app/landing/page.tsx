"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, PenLine, Users2, BarChart3, Bell } from "lucide-react";

export default function Landing() {
  const router = useRouter();

  useEffect(() => {
    const guardado = localStorage.getItem("modoOscuro") === "true";
    if (guardado) document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors animate-fade-in">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" width={40} height={40} className="rounded-full shadow" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA · Aguascalientes</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-tight">ENSFA+</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md transition active:scale-95"
        >
          Iniciar sesión
        </button>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 sm:px-8 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">Plataforma oficial ENSFA</span>
            <h1 className="text-4xl md:text-6xl font-extrabold mt-5 leading-tight">
              Tu práctica<br />
              docente,<br />
              <span className="text-yellow-300">organizada.</span>
            </h1>
            <p className="text-blue-100 mt-5 text-lg leading-relaxed max-w-md">
              La plataforma digital para practicantes de la Escuela Normal Superior Federal de Aguascalientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => router.push("/login")}
                className="bg-white text-blue-700 font-bold px-7 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition text-sm active:scale-95"
              >
                Comenzar ahora →
              </button>
              <button
                onClick={() => router.push("/login")}
                className="border border-white/40 text-white font-medium px-7 py-3.5 rounded-2xl hover:bg-white/10 transition text-sm backdrop-blur-sm active:scale-95"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 hidden md:block">
            <div className="w-64 h-64 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <img src="/logo.png" alt="ENSFA" className="w-48 h-48 rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-900 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { num: "100%", label: "Gratuito para la ENSFA" },
            { num: "6+", label: "Funciones disponibles" },
            { num: "24/7", label: "Disponible siempre" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-extrabold text-white">{s.num}</p>
              <p className="text-slate-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-8 bg-white dark:bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">Funciones</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-slate-100 mt-4">Todo lo que necesitas</h2>
            <p className="text-slate-400 mt-3">Diseñado específicamente para practicantes docentes</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, titulo: "Diarios de práctica", desc: "Registra tus experiencias diarias y recibe retroalimentación de tu evaluador en tiempo real.", color: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
              { icon: ClipboardList, titulo: "Planeaciones", desc: "Sube y organiza tus planeaciones de clase en tu portafolio digital personal.", color: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40", iconColor: "text-indigo-600 dark:text-indigo-400" },
              { icon: PenLine, titulo: "Narrativa pedagógica", desc: "Comparte tu narrativa y reflexiones sobre tu proceso de formación docente.", color: "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400" },
              { icon: Users2, titulo: "Comunidad", desc: "Conecta con otros practicantes, comparte actividades y resuelve dudas juntos.", color: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
              { icon: BarChart3, titulo: "Portafolio digital", desc: "Tu evaluador puede ver todo tu trabajo organizado y calificarlo fácilmente.", color: "bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/40", iconColor: "text-purple-600 dark:text-purple-400" },
              { icon: Bell, titulo: "Notificaciones", desc: "Recibe avisos instantáneos cuando tu evaluador comente tus publicaciones.", color: "bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/40", iconColor: "text-red-600 dark:text-red-400" },
            ].map((f) => (
              <div key={f.titulo} className={`rounded-2xl p-6 border ${f.color} hover:shadow-lg transition`}>
                <f.icon size={32} className={`mb-4 ${f.iconColor}`} />
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-2">{f.titulo}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-4 sm:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">¿Cómo funciona?</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-slate-100 mt-4 mb-12">Tres pasos para empezar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[
              { num: "01", titulo: "Inicia sesión", desc: "Usa tu correo institucional @ensfa.edu.mx para acceder a la plataforma." },
              { num: "02", titulo: "Publica tu práctica", desc: "Sube tus diarios, planeaciones y narrativas fácilmente desde cualquier dispositivo." },
              { num: "03", titulo: "Recibe retroalimentación", desc: "Tu evaluador revisa y comenta tus publicaciones en tiempo real." },
            ].map((p) => (
              <div key={p.num} className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-4 shadow-lg">
                  {p.num}
                </div>
                <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-2">{p.titulo}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-br from-blue-700 to-blue-500 text-white text-center">
        <img src="/logo.png" alt="ENSFA" className="w-20 h-20 rounded-full mx-auto mb-6 shadow-xl border-4 border-white/30" />
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Listo para comenzar?</h2>
        <p className="text-blue-100 mb-8 text-lg">Inicia sesión con tu correo <span className="text-yellow-300 font-semibold">@ensfa.edu.mx</span></p>
        <button
          onClick={() => router.push("/login")}
          className="bg-white text-blue-700 font-bold px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition text-base active:scale-95"
        >
          Iniciar sesión con Google →
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8 px-4 text-center">
        <img src="/logo.png" alt="ENSFA" className="w-10 h-10 rounded-full mx-auto mb-3 opacity-80" />
        <p className="text-slate-400 text-sm">© 2026 ENSFA+</p>
        <p className="text-slate-500 text-xs mt-1">Escuela Normal Superior Federal de Aguascalientes · Profr. José Santos Valdés</p>
      </footer>

    </div>
  );
}