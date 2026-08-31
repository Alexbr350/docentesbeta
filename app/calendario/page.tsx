"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Navbar from "../components/Navbar";
import CalendarioEscolar from "../components/CalendarioEscolar";
import { EventoCalendario } from "../lib/calendarioEscolar";
import { CalendarDays } from "lucide-react";

export default function Calendario() {
  const router = useRouter();
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      cargarCalendario();
    });
    return () => unsubscribe();
  }, [router]);

  const cargarCalendario = async () => {
    const snap = await getDocs(query(collection(db, "calendario_escolar"), orderBy("fechaInicio", "asc")));
    setEventos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventoCalendario[]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Calendario" />

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={24} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Calendario escolar</h2>
            <p className="text-sm text-slate-400 mt-0.5">Prácticas, observaciones, vacaciones y fechas importantes del semestre</p>
          </div>
        </div>

        {!loading && <CalendarioEscolar eventos={eventos} />}
      </div>
    </div>
  );
}
