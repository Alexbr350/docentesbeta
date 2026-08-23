"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Navbar from "../components/Navbar";

export default function Eventos() {
  const router = useRouter();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      cargarEventos();
    });
    return () => unsubscribe();
  }, [router]);

  const cargarEventos = async () => {
    const snap = await getDocs(query(collection(db, "eventos"), orderBy("fechaEvento", "asc")));
    setEventos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const hoy = new Date().toISOString().split("T")[0];
  const proximos = eventos.filter((e) => e.fechaEvento >= hoy);
  const pasados = eventos.filter((e) => e.fechaEvento < hoy);

  if (loading && eventos.length === 0) {
    // sigue cargando
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Eventos" />

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-xl">
          <div className="text-4xl">📅</div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Eventos institucionales</h2>
            <p className="text-sm text-slate-400 mt-0.5">Fechas y avisos importantes de la ENSFA</p>
          </div>
        </div>

        <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Próximos eventos</h3>
        {proximos.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md mb-6">
            No hay eventos próximos por el momento.
          </div>
        )}
        {proximos.map((e) => (
          <div key={e.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
            {e.imagenUrl && /\.pdf$/i.test(e.imagenNombre || "") ? (
              <a href={e.imagenUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 transition mb-3">
                📄 Ver documento del evento
              </a>
            ) : e.imagenUrl && (
              <img src={e.imagenUrl} alt={e.titulo} className="w-full rounded-xl mb-3 border border-slate-200 dark:border-slate-800 max-h-64 object-cover" />
            )}
            <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100 break-words">{e.titulo}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed break-words">{e.descripcion}</p>
            <p className="text-xs text-blue-600 font-semibold mt-2">
              📅 {new Date(e.fechaEvento + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        ))}

        {pasados.length > 0 && (
          <>
            <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 mt-8">Eventos pasados</h3>
            {pasados.map((e) => (
              <div key={e.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md opacity-60">
                <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100 break-words">{e.titulo}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed break-words">{e.descripcion}</p>
                <p className="text-xs text-slate-400 font-semibold mt-2">
                  📅 {new Date(e.fechaEvento + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}