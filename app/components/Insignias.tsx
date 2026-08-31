"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { BookOpen, Medal, Trophy, Star, Award, Lock, Flame } from "lucide-react";
import { calcularRacha } from "../lib/racha";

const METAS: Record<string, number> = { "Diario": 10, "Planeación": 5, "Narrativa": 1, "Extra": 3 };

function calcularInsignias(posts: any[], email?: string) {
  const conteo: Record<string, number> = {};
  posts.forEach((p) => {
    if (p.tipo) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  });

  const todasLasMetas = ["Diario", "Planeación", "Narrativa", "Extra"].every(
    (tipo) => (conteo[tipo] || 0) >= METAS[tipo]
  );

  const racha = calcularRacha(posts, email || "");

  return [
    {
      id: "primer_diario",
      nombre: "Primer Diario",
      descripcion: "Publica tu primer Diario",
      icono: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      fondo: "bg-blue-100 dark:bg-blue-950/40",
      desbloqueada: (conteo["Diario"] || 0) >= 1,
    },
    {
      id: "diario_constante",
      nombre: "Diario Constante",
      descripcion: "Completa tu meta de 10 Diarios",
      icono: Medal,
      color: "text-indigo-600 dark:text-indigo-400",
      fondo: "bg-indigo-100 dark:bg-indigo-950/40",
      desbloqueada: (conteo["Diario"] || 0) >= METAS["Diario"],
    },
    {
      id: "planeador_experto",
      nombre: "Planeador Experto",
      descripcion: "Completa tu meta de 5 Planeaciones",
      icono: Trophy,
      color: "text-cyan-600 dark:text-cyan-400",
      fondo: "bg-cyan-100 dark:bg-cyan-950/40",
      desbloqueada: (conteo["Planeación"] || 0) >= METAS["Planeación"],
    },
    {
      id: "narrador",
      nombre: "Narrador",
      descripcion: "Publica tu primera Narrativa",
      icono: Star,
      color: "text-amber-600 dark:text-amber-400",
      fondo: "bg-amber-100 dark:bg-amber-950/40",
      desbloqueada: (conteo["Narrativa"] || 0) >= 1,
    },
    {
      id: "todas_las_metas",
      nombre: "Todas las metas",
      descripcion: "Completa las 4 metas principales de tu portafolio",
      icono: Award,
      color: "text-yellow-600 dark:text-yellow-400",
      fondo: "bg-yellow-100 dark:bg-yellow-950/40",
      desbloqueada: todasLasMetas,
    },
    {
      id: "racha_3",
      nombre: "Racha de 3 días",
      descripcion: "Publica 3 días seguidos",
      icono: Flame,
      color: "text-orange-600 dark:text-orange-400",
      fondo: "bg-orange-100 dark:bg-orange-950/40",
      desbloqueada: racha >= 3,
    },
    {
      id: "racha_7",
      nombre: "Racha de 7 días",
      descripcion: "Publica 7 días seguidos",
      icono: Flame,
      color: "text-red-600 dark:text-red-400",
      fondo: "bg-red-100 dark:bg-red-950/40",
      desbloqueada: racha >= 7,
    },
    {
      id: "racha_14",
      nombre: "Racha de 14 días",
      descripcion: "Publica 14 días seguidos",
      icono: Flame,
      color: "text-rose-600 dark:text-rose-400",
      fondo: "bg-rose-100 dark:bg-rose-950/40",
      desbloqueada: racha >= 14,
    },
    {
      id: "racha_30",
      nombre: "Racha de 30 días",
      descripcion: "Publica 30 días seguidos",
      icono: Flame,
      color: "text-pink-600 dark:text-pink-400",
      fondo: "bg-pink-100 dark:bg-pink-950/40",
      desbloqueada: racha >= 30,
    },
  ];
}

function ConfettiBurst() {
  const [particulas] = useState(() => {
    const colores = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];
    return Array.from({ length: 12 }, (_, i) => {
      const angulo = (i / 12) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const distancia = 26 + Math.random() * 20;
      return {
        id: i,
        tx: Math.cos(angulo) * distancia,
        ty: Math.sin(angulo) * distancia,
        tr: Math.random() * 360 - 180,
        color: colores[i % colores.length],
        delay: Math.random() * 80,
      };
    });
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particulas.map((p) => (
        <span
          key={p.id}
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-sm animate-confetti"
          style={
            {
              backgroundColor: p.color,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--tr": `${p.tr}deg`,
              animationDelay: `${p.delay}ms`,
            } as any
          }
        />
      ))}
    </div>
  );
}

export default function Insignias({ posts, email, nombre }: { posts: any[]; email?: string; nombre?: string }) {
  const [insignias, setInsignias] = useState(() => calcularInsignias([], ""));
  const [confettiActivo, setConfettiActivo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nuevas = calcularInsignias(posts, email);
    setInsignias(nuevas);
    if (email) sincronizarDesbloqueos(nuevas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, email]);

  const sincronizarDesbloqueos = async (nuevas: ReturnType<typeof calcularInsignias>) => {
    const ref = doc(db, "usuarios", email as string);
    const snap = await getDoc(ref);
    const previas: string[] = snap.exists() ? snap.data().insigniasDesbloqueadas || [] : [];

    const idsDesbloqueadasAhora = nuevas.filter((i) => i.desbloqueada).map((i) => i.id);
    const nuevasDesbloqueadas = idsDesbloqueadasAhora.filter((id) => !previas.includes(id));

    if (nuevasDesbloqueadas.length > 0) {
      // El confetti solo se muestra si ya existía un registro previo (evita que se disparen
      // varias insignias a la vez en la primerísima sincronización de un usuario existente)
      if (snap.exists()) {
        setConfettiActivo((prev) => {
          const nuevo = { ...prev };
          nuevasDesbloqueadas.forEach((id) => { nuevo[id] = true; });
          return nuevo;
        });
        setTimeout(() => {
          setConfettiActivo((prev) => {
            const nuevo = { ...prev };
            nuevasDesbloqueadas.forEach((id) => { nuevo[id] = false; });
            return nuevo;
          });
        }, 900);
      }

      for (const id of nuevasDesbloqueadas) {
        const insignia = nuevas.find((i) => i.id === id);
        await addDoc(collection(db, "notificaciones"), {
          para: email,
          de: "ENSFA+",
          mensaje: `¡Desbloqueaste la insignia "${insignia?.nombre}"!`,
          leida: false,
          fecha: serverTimestamp(),
        });
      }
    }

    if (idsDesbloqueadasAhora.length !== previas.length || nuevasDesbloqueadas.length > 0) {
      await setDoc(ref, { insigniasDesbloqueadas: idsDesbloqueadasAhora, nombre: nombre || "", email }, { merge: true });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md">
      <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-5 flex items-center gap-1.5">
        <Award size={16} className="text-amber-500" /> Insignias
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {insignias.map((ins) => {
          const Icono = ins.desbloqueada ? ins.icono : Lock;
          return (
            <div
              key={ins.id}
              title={ins.descripcion}
              className={`relative rounded-xl p-3 text-center border transition ${
                ins.desbloqueada
                  ? `${ins.fondo} border-transparent`
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60"
              }`}
            >
              {confettiActivo[ins.id] && <ConfettiBurst />}
              <Icono size={20} className={`mx-auto mb-1.5 ${ins.desbloqueada ? ins.color : "text-slate-400 dark:text-slate-500"}`} />
              <p className={`text-xs font-semibold leading-tight ${ins.desbloqueada ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                {ins.nombre}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
