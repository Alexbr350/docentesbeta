"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, addDoc, serverTimestamp, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { Layers, Plus, Users2, X } from "lucide-react";
import { ADMINS } from "../lib/admins";

export default function Grupos() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [descripcionGrupo, setDescripcionGrupo] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/landing");
      } else {
        setUser(currentUser);
        const admin = ADMINS.includes(currentUser.email || "");
        setEsAdmin(admin);
        cargarTodo(currentUser, admin);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const cargarTodo = async (currentUser: any, admin: boolean) => {
    const postsSnap = await getDocs(collection(db, "posts"));
    const emails = [...new Set(postsSnap.docs.map((d) => d.data().email))];
    const usuariosData = emails.map((email) => ({
      email,
      nombre: postsSnap.docs.find((d) => d.data().email === email)?.data().autor,
    }));
    setUsuarios(usuariosData);

    let gruposSnap;
    if (admin) {
      gruposSnap = await getDocs(collection(db, "grupos"));
    } else {
      gruposSnap = await getDocs(query(collection(db, "grupos"), where("creadoPor", "==", currentUser.email)));
    }
    const gruposData = await Promise.all(gruposSnap.docs.map(async (d) => {
      const miembrosSnap = await getDocs(collection(db, "grupos", d.id, "miembros"));
      return { id: d.id, ...d.data(), miembros: miembrosSnap.docs.map(m => m.data()) };
    }));
    setGrupos(gruposData);
    setLoading(false);
  };

  const crearGrupo = async () => {
    if (!nombreGrupo.trim()) return;
    setCreando(true);
    await addDoc(collection(db, "grupos"), {
      nombre: nombreGrupo,
      descripcion: descripcionGrupo,
      creadoPor: user.email,
      creadoPorNombre: user.displayName || user.email,
      fecha: serverTimestamp(),
    });
    setNombreGrupo("");
    setDescripcionGrupo("");
    setShowForm(false);
    setCreando(false);
    cargarTodo(user, esAdmin);
  };

  const agregarMiembro = async (grupoId: string, email: string, nombre: string) => {
    await addDoc(collection(db, "grupos", grupoId, "miembros"), {
      email, nombre, fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: email,
      de: user.displayName || user.email,
      mensaje: "te agregó a un grupo",
      leida: false,
      fecha: serverTimestamp(),
    });
    cargarTodo(user, esAdmin);
  };

  const eliminarMiembro = async (grupoId: string, memberEmail: string) => {
    const snap = await getDocs(collection(db, "grupos", grupoId, "miembros"));
    const memberDoc = snap.docs.find(d => d.data().email === memberEmail);
    if (memberDoc) await deleteDoc(doc(db, "grupos", grupoId, "miembros", memberDoc.id));
    cargarTodo(user, esAdmin);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando grupos...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Grupos" />

      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <Layers size={32} className="text-orange-400" />
            <div>
              <h2 className="text-lg font-extrabold text-white">Grupos</h2>
              <p className="text-sm text-slate-400 mt-0.5">Organiza practicantes en grupos</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95"
          >
            <Plus size={16} /> Crear grupo
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-6 shadow-lg border border-blue-100 dark:border-blue-900/40">
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5"><Layers size={16} className="text-orange-500" /> Nuevo grupo</h3>
            <input
              type="text"
              placeholder="Nombre del grupo..."
              value={nombreGrupo}
              onChange={(e) => setNombreGrupo(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mb-3 focus:outline-none focus:border-blue-400"
            />
            <textarea
              placeholder="Descripción del grupo..."
              value={descripcionGrupo}
              onChange={(e) => setDescripcionGrupo(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 resize-none mb-3 focus:outline-none focus:border-blue-400"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2">Cancelar</button>
              <button
                onClick={crearGrupo}
                disabled={creando || !nombreGrupo.trim()}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
              >
                {creando ? "Creando..." : "Crear grupo"}
              </button>
            </div>
          </div>
        )}

        {grupos.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
            No hay grupos todavía. ¡Crea el primero!
          </div>
        )}

        {grupos.map((grupo) => (
          <div key={grupo.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{grupo.nombre}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{grupo.descripcion}</p>
                <p className="text-xs text-slate-400">Creado por: {grupo.creadoPorNombre}</p>
              </div>
              <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-semibold">
                <Users2 size={13} /> {grupo.miembros?.length || 0} miembros
              </span>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Miembros:</p>
              {grupo.miembros?.length === 0 && <p className="text-xs text-slate-400">Sin miembros todavía.</p>}
              {grupo.miembros?.map((m: any) => (
                <div key={m.email} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {m.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{m.nombre}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarMiembro(grupo.id, m.email)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold"
                  >
                    <X size={12} /> Quitar
                  </button>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Agregar practicante:</p>
              <div className="flex flex-wrap gap-2">
                {usuarios
                  .filter(u => !grupo.miembros?.find((m: any) => m.email === u.email))
                  .map((u) => (
                    <button
                      key={u.email}
                      onClick={() => agregarMiembro(grupo.id, u.email, u.nombre)}
                      className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl font-medium transition"
                    >
                      <Plus size={12} /> {u.nombre}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}