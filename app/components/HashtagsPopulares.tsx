"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { Hash } from "lucide-react";
import Spinner from "./Spinner";

type ItemHashtag = { tag: string; cantidad: number };

export default function HashtagsPopulares() {
  const router = useRouter();
  const [ranking, setRanking] = useState<ItemHashtag[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarHashtags();
  }, []);

  const cargarHashtags = async () => {
    try {
      const hace7dias = new Date();
      hace7dias.setDate(hace7dias.getDate() - 7);
      // Igual que Tendencias.tsx: un solo where sobre `fecha` (sin orderBy
      // combinado) para no necesitar un índice compuesto en Firestore; el
      // conteo por hashtag se hace en el cliente.
      const q = query(collection(db, "posts"), where("fecha", ">=", Timestamp.fromDate(hace7dias)));
      const snap = await getDocs(q);

      const conteo: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const tags: string[] = d.data().hashtags || [];
        tags.forEach((t) => { conteo[t] = (conteo[t] || 0) + 1; });
      });

      const top5 = Object.entries(conteo)
        .map(([tag, cantidad]) => ({ tag, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      setRanking(top5);
    } finally {
      setCargando(false);
    }
  };

  if (!cargando && ranking.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mt-4 shadow-md">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Hash size={14} className="text-blue-500" /> Hashtags populares
      </p>

      {cargando && <Spinner tamano={14} texto="Cargando..." />}

      {!cargando && ranking.map((item) => (
        <button
          key={item.tag}
          onClick={() => router.push(`/hashtag/${item.tag}`)}
          className="flex items-center justify-between w-full gap-2 mb-2 last:mb-0 p-1.5 -mx-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition text-left"
        >
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">#{item.tag}</span>
          <span className="text-[11px] text-slate-400 flex-shrink-0">
            {item.cantidad} publicaci{item.cantidad === 1 ? "ón" : "ones"}
          </span>
        </button>
      ))}
    </div>
  );
}
