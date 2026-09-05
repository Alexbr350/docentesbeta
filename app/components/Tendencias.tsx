"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { TrendingUp, BookOpen, ClipboardList, PenLine, Layers, HelpCircle, Flame } from "lucide-react";
import Spinner from "./Spinner";

const TIPOS_INFO: Record<string, { icono: any; bg: string; texto: string }> = {
  "Diario": { icono: BookOpen, bg: "bg-blue-100 dark:bg-blue-950/40", texto: "text-blue-700 dark:text-blue-400" },
  "Planeación": { icono: ClipboardList, bg: "bg-indigo-100 dark:bg-indigo-950/40", texto: "text-indigo-700 dark:text-indigo-400" },
  "Narrativa": { icono: PenLine, bg: "bg-amber-100 dark:bg-amber-950/40", texto: "text-amber-700 dark:text-amber-400" },
  "Extra": { icono: Layers, bg: "bg-cyan-100 dark:bg-cyan-950/40", texto: "text-cyan-700 dark:text-cyan-400" },
  "Pedir ayuda": { icono: HelpCircle, bg: "bg-red-100 dark:bg-red-950/40", texto: "text-red-700 dark:text-red-400" },
};

type ItemTendencia = { tipo: string; cantidad: number };

export default function Tendencias() {
  const [ranking, setRanking] = useState<ItemTendencia[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarTendencias();
  }, []);

  const cargarTendencias = async () => {
    try {
      const hace7dias = new Date();
      hace7dias.setDate(hace7dias.getDate() - 7);
      const q = query(collection(db, "posts"), where("fecha", ">=", Timestamp.fromDate(hace7dias)));
      const snap = await getDocs(q);

      const conteo: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const tipo = d.data().tipo;
        if (tipo) conteo[tipo] = (conteo[tipo] || 0) + 1;
      });

      const top3 = Object.entries(conteo)
        .map(([tipo, cantidad]) => ({ tipo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 3);

      setRanking(top3);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mt-4 shadow-md">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <TrendingUp size={14} className="text-orange-500" /> Tendencias
      </p>

      {cargando && <Spinner tamano={14} texto="Cargando..." />}

      {!cargando && ranking.length === 0 && (
        <p className="text-xs text-slate-400">Aún no hay actividad esta semana.</p>
      )}

      {!cargando && ranking.map((item, i) => {
        const info = TIPOS_INFO[item.tipo] || TIPOS_INFO["Diario"];
        const Icono = info.icono;
        return (
          <div key={item.tipo} className="flex items-center gap-2 mb-2 last:mb-0">
            <div className={`relative w-7 h-7 rounded-lg ${info.bg} flex items-center justify-center flex-shrink-0`}>
              <Icono size={14} className={info.texto} />
              {i === 0 && (
                <Flame size={11} className="absolute -top-1.5 -right-1.5 text-orange-500 fill-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                #{i + 1} {item.tipo}
              </p>
              <p className="text-[11px] text-slate-400">
                {item.cantidad} publicaci{item.cantidad === 1 ? "ón" : "ones"} esta semana
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
