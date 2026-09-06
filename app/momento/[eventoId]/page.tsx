"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../firebase";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Users, X } from "lucide-react";
import { EventoCalendario } from "../../lib/calendarioEscolar";
import Spinner from "../../components/Spinner";

// Álbum colaborativo de un evento: a diferencia de las Stories normales (que
// se ocultan a las 24h), aquí se muestran TODAS las historias que se
// etiquetaron con este eventoId, sin límite de tiempo, porque el propósito
// del Momento es quedar como recuerdo del evento, no ser efímero.
export default function MomentoPage() {
  const router = useRouter();
  const params = useParams<{ eventoId: string }>();
  const eventoId = Array.isArray(params?.eventoId) ? params.eventoId[0] : params?.eventoId;

  const [cargando, setCargando] = useState(true);
  const [evento, setEvento] = useState<EventoCalendario | null>(null);
  const [historias, setHistorias] = useState<any[]>([]);
  const [indice, setIndice] = useState(0);
  const [barraLlena, setBarraLlena] = useState(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      cargarMomento();
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  const cargarMomento = async () => {
    if (!eventoId) { setCargando(false); return; }
    const evSnap = await getDoc(doc(db, "calendario_escolar", eventoId));
    if (evSnap.exists()) setEvento({ id: evSnap.id, ...evSnap.data() } as EventoCalendario);

    const storiesSnap = await getDocs(
      query(collection(db, "stories"), where("eventoId", "==", eventoId), orderBy("fecha", "asc"))
    );
    setHistorias(storiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setCargando(false);
  };

  const siguiente = () => {
    setIndice((prev) => Math.min(prev + 1, Math.max(historias.length - 1, 0)));
  };

  const anterior = () => {
    setIndice((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (historias.length === 0) return;
    const esVideoActual = historias[indice]?.esVideo;
    setBarraLlena(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const inicio = setTimeout(() => setBarraLlena(true), 50);
    let avance: any = null;
    if (!esVideoActual && indice < historias.length - 1) {
      avance = setTimeout(() => siguiente(), 5000);
      timeoutRef.current = avance;
    }

    return () => {
      clearTimeout(inicio);
      if (avance) clearTimeout(avance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historias, indice]);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Spinner tamano={28} texto="Cargando Momento..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-white p-1.5 -m-1.5 rounded-lg hover:bg-white/10 transition" aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-1.5 text-white font-extrabold text-sm">
          <Users size={16} className="text-amber-400" /> Momento: {evento?.titulo || "Evento"}
        </div>
        <button onClick={() => router.push("/")} className="ml-auto text-white/70 hover:text-white p-1.5 -m-1.5 rounded-lg hover:bg-white/10 transition" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      {historias.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <Users size={32} className="text-slate-500 mb-3" />
          <p className="text-slate-300 text-sm font-semibold">Aún no hay historias en este Momento colaborativo.</p>
          <p className="text-slate-500 text-xs mt-1">Cuando los practicantes autorizados suban sus Stories a este evento, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {historias.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < indice ? "100%" : i === indice && barraLlena ? "100%" : "0%",
                    transition: i === indice && !historias[indice]?.esVideo ? "width 5s linear" : "none",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={anterior} />
          <div className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={siguiente} />

          <div className="max-w-md w-full px-4 relative z-0">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-lg">
                {historias[indice].autor?.charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-sm font-semibold drop-shadow">{historias[indice].autor}</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {historias[indice].esVideo ? (
                <video
                  key={historias[indice].id}
                  src={historias[indice].imagenUrl}
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-h-[65vh] object-contain bg-black/40"
                  onEnded={siguiente}
                />
              ) : (
                <img src={historias[indice].imagenUrl} alt="" className="w-full max-h-[65vh] object-contain bg-black/40" />
              )}
            </div>
            <p className="text-center text-white/50 text-xs mt-3">
              {indice + 1} de {historias.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
