"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, query, where, serverTimestamp } from "firebase/firestore";
import { UserPlus, Users2, Check } from "lucide-react";
import { useToast } from "./Toast";

type Sugerencia = {
  email: string;
  nombre: string;
  fotoUrl: string;
  motivo: string;
  score: number;
};

export default function AmigosSugeridos({ compacto = false }: { compacto?: boolean }) {
  const { mostrarToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [enviadas, setEnviadas] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        cargarSugerencias(currentUser);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarSugerencias = async (currentUser: any) => {
    try {
      const email = currentUser.email as string;

      const postsSnap = await getDocs(collection(db, "posts"));
      const universo: Record<string, string> = {};
      postsSnap.docs.forEach((d) => {
        const data: any = d.data();
        if (data.email && data.autor) universo[data.email] = data.autor;
      });

      const perfilesSnap = await getDocs(collection(db, "perfiles"));
      const perfiles: Record<string, any> = {};
      perfilesSnap.docs.forEach((d) => {
        perfiles[d.id] = d.data();
      });

      const amigosSnap = await getDocs(collection(db, "amigos"));
      const todasAmistades = amigosSnap.docs.map((d) => d.data() as { usuario: string; amigo: string });
      const misAmigos = new Set(todasAmistades.filter((a) => a.usuario === email).map((a) => a.amigo));

      const conteoComunes: Record<string, number> = {};
      todasAmistades.forEach((a) => {
        if (misAmigos.has(a.usuario) && a.amigo !== email && !misAmigos.has(a.amigo)) {
          conteoComunes[a.amigo] = (conteoComunes[a.amigo] || 0) + 1;
        }
      });

      const [solDeSnap, solParaSnap] = await Promise.all([
        getDocs(query(collection(db, "solicitudes"), where("de", "==", email))),
        getDocs(query(collection(db, "solicitudes"), where("para", "==", email))),
      ]);
      const pendientes = new Set<string>();
      solDeSnap.docs.forEach((d) => {
        const s: any = d.data();
        if (s.estado === "pendiente") pendientes.add(s.para);
      });
      solParaSnap.docs.forEach((d) => {
        const s: any = d.data();
        if (s.estado === "pendiente") pendientes.add(s.de);
      });

      const gruposSnap = await getDocs(collection(db, "grupos"));
      const gruposMiembros = await Promise.all(
        gruposSnap.docs.map(async (g) => {
          const miembrosSnap = await getDocs(collection(db, "grupos", g.id, "miembros"));
          return miembrosSnap.docs.map((m) => m.data().email as string);
        })
      );
      const companerosGrupo = new Set<string>();
      gruposMiembros
        .filter((miembros) => miembros.includes(email))
        .forEach((miembros) => miembros.forEach((m) => { if (m !== email) companerosGrupo.add(m); }));

      const miPerfil = perfiles[email] || {};

      const candidatos = Object.keys(universo).filter(
        (e) => e !== email && !misAmigos.has(e) && !pendientes.has(e)
      );

      const conMotivo: Sugerencia[] = candidatos.map((candEmail) => {
        const comunes = conteoComunes[candEmail] || 0;
        const mismoGrupo = companerosGrupo.has(candEmail);
        const perfilCand = perfiles[candEmail] || {};
        const mismaLic = !!miPerfil.licenciatura && miPerfil.licenciatura === perfilCand.licenciatura;
        const mismoSem = !!miPerfil.semestre && miPerfil.semestre === perfilCand.semestre;

        const score = comunes * 10 + (mismoGrupo ? 5 : 0) + (mismaLic ? 2 : 0) + (mismoSem ? 1 : 0);

        let motivo = "Practicante en ENSFA+";
        if (comunes > 0) motivo = `${comunes} amigo${comunes > 1 ? "s" : ""} en común`;
        else if (mismoGrupo) motivo = "Mismo grupo";
        else if (mismaLic) motivo = "Misma licenciatura";
        else if (mismoSem) motivo = `Semestre ${perfilCand.semestre}`;

        return {
          email: candEmail,
          nombre: universo[candEmail] || candEmail,
          fotoUrl: perfilCand.fotoUrl || "",
          motivo,
          score,
        };
      });

      conMotivo.sort((a, b) => b.score - a.score || a.nombre.localeCompare(b.nombre));
      setSugerencias(conMotivo.slice(0, compacto ? 3 : 5));
    } finally {
      setCargando(false);
    }
  };

  const agregar = async (candEmail: string) => {
    if (!user) return;
    await addDoc(collection(db, "solicitudes"), {
      de: user.email,
      deNombre: user.displayName || user.email,
      para: candEmail,
      estado: "pendiente",
      fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: candEmail,
      de: user.displayName || user.email,
      mensaje: "te envió una solicitud de amistad",
      leida: false,
      fecha: serverTimestamp(),
    });
    setEnviadas((prev) => new Set(prev).add(candEmail));
    mostrarToast("Solicitud enviada!");
  };

  if (cargando || sugerencias.length === 0) return null;

  if (compacto) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mt-4 shadow-md">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Users2 size={14} className="text-emerald-500" /> Quizás conozcas
        </p>
        {sugerencias.map((s) => (
          <div key={s.email} className="flex items-center gap-2 mb-2 last:mb-0">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 overflow-hidden">
              {s.fotoUrl ? (
                <img src={s.fotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                s.nombre?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{s.nombre}</p>
              <p className="text-[11px] text-slate-400 truncate">{s.motivo}</p>
            </div>
            {enviadas.has(s.email) ? (
              <Check size={14} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <button
                onClick={() => agregar(s.email)}
                title="Agregar"
                className="flex-shrink-0 p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition"
              >
                <UserPlus size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-6 shadow-md">
      <h2 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5">
        <Users2 size={16} className="text-emerald-500" /> Personas que quizás conozcas
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {sugerencias.map((s) => (
          <div key={s.email} className="flex-shrink-0 w-44 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-lg font-extrabold mx-auto mb-2 overflow-hidden">
              {s.fotoUrl ? (
                <img src={s.fotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                s.nombre?.charAt(0).toUpperCase()
              )}
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{s.nombre}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.motivo}</p>
            {enviadas.has(s.email) ? (
              <span className="mt-2 flex items-center justify-center gap-1 text-xs bg-green-100 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl font-semibold">
                <Check size={13} /> Enviada
              </span>
            ) : (
              <button
                onClick={() => agregar(s.email)}
                className="mt-2 w-full flex items-center justify-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-semibold shadow transition active:scale-95"
              >
                <UserPlus size={13} /> Agregar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
