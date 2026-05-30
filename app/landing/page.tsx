"use client";
import { useRouter } from "next/navigation";


export default function Landing() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="px-8 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA Logo" width={48} height={48} className="rounded-full" />
          <div>
            <p className="text-xs text-slate-500 font-medium">Escuela Normal Superior Federal de Aguascalientes</p>
            <p className="text-sm font-bold text-blue-600">DocentesBeta</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow transition"
        >
          Iniciar sesión
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-20 flex items-center gap-16">
        <div className="flex-1">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Plataforma educativa</span>
          <h1 className="text-5xl font-extrabold text-gray-900 mt-4 leading-tight">
            Tu práctica docente,<br />
            <span className="text-blue-600">organizada y visible.</span>
          </h1>
          <p className="text-slate-500 mt-5 text-lg leading-relaxed">
            DocentesBeta es la plataforma oficial para practicantes de la ENSFA. Publica tus diarios, planeaciones y narrativas, y conecta con otros docentes.
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => router.push("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg transition text-sm"
            >
              Comenzar ahora →
            </button>
            <button
              onClick={() => router.push("/login")}
              className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium px-6 py-3 rounded-2xl transition text-sm"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <img src="/logo.png" alt="ENSFA" width={220} height={220} className="rounded-3xl shadow-2xl" />
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Todo lo que necesitas en un solo lugar</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: "📓", titulo: "Diarios de práctica", desc: "Registra tus experiencias diarias en el aula y recibe retroalimentación de tu evaluador." },
              { icon: "📋", titulo: "Planeaciones", desc: "Sube tus planeaciones de clase y mantenlas organizadas en tu portafolio personal." },
              { icon: "✍️", titulo: "Narrativa pedagógica", desc: "Comparte tu narrativa y reflexiones sobre tu proceso de formación docente." },
              { icon: "🤝", titulo: "Comunidad", desc: "Conecta con otros practicantes, comparte actividades y resuelve dudas juntos." },
              { icon: "📊", titulo: "Portafolio digital", desc: "Tu evaluador puede ver todo tu trabajo organizado en un solo lugar." },
              { icon: "🔔", titulo: "Notificaciones", desc: "Recibe avisos cuando tu evaluador comente o califique tus publicaciones." },
            ].map((f) => (
              <div key={f.titulo} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-bold text-gray-800 mb-2">{f.titulo}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-2xl mx-auto px-8">
          <img src="/logo.png" alt="ENSFA" width={80} height={80} className="rounded-full mx-auto mb-6 shadow-lg" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">¿Listo para comenzar?</h2>
          <p className="text-slate-500 mb-8">Inicia sesión con tu correo institucional <span className="text-blue-600 font-medium">@ensfa.edu.mx</span></p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg transition text-base"
          >
            Iniciar sesión con Google →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center">
        <p className="text-xs text-slate-400">© 2026 DocentesBeta — Escuela Normal Superior Federal de Aguascalientes</p>
        <p className="text-xs text-slate-300 mt-1">Profr. José Santos Valdés</p>
      </footer>

    </div>
  );
}