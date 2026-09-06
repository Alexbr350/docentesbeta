"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import { Radio } from "lucide-react";

export default function EnVivo() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [config, setConfig] = useState<{ activa?: boolean; youtubeVideoId?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      cargarConfig();
    });
    return () => unsubscribe();
  }, [router]);

  const cargarConfig = async () => {
    const snap = await getDoc(doc(db, "configuracion", "transmision"));
    setConfig(snap.exists() ? (snap.data() as any) : null);
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="En vivo" />

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center flex-shrink-0">
            <Radio size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Transmisión en vivo</h2>
            <p className="text-sm text-slate-400 mt-0.5">Transmisión institucional de la ENSFA</p>
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-16">
            <Spinner tamano={26} texto="Cargando transmisión..." />
          </div>
        ) : config?.activa && config.youtubeVideoId ? (
          <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${config.youtubeVideoId}?autoplay=1`}
              title="Transmisión en vivo ENSFA+"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
            No hay ninguna transmisión en vivo en este momento.
          </div>
        )}
      </div>
    </div>
  );
}
