"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { GraduationCap, Star, MessageCircle, Send, Users2 } from "lucide-react";

export default function Maestro() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [misGrupos, setMisGrupos] = useState<any[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [calificaciones, setCalificaciones] = useState<any>({});
  const [comentarios, setComentarios] = useState<any>({});
  const [showComentarios, setShowComentarios] = useState<any>({});
  const [nuevoComentario, setNuevoComentario] = useState<any>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      
      const maestrosSnap = await getDocs(query(collection(db, "maestros"), where("email", "==", currentUser.email)));
      if (maestrosSnap.empty) {
        setAccesoDenegado(true);
        setLoading(false);
        return;
      }
      
      setUser(currentUser);
      cargarMisGrupos(currentUser.email || "");
    });
    return () => unsubscribe();
  }, [router]);

  const cargarMisGrupos = async (email: string) => {
    const snap = await getDocs(query(collection(db, "grupos"), where("creadoPor", "==", email)));
    const grupos = await Promise.all(snap.docs.map(async (d) => {
      const miembrosSnap = await getDocs(collection(db, "grupos", d.id, "miembros"));
      return { id: d.id, ...d.data(), miembros: miembrosSnap.docs.map(m => m.data()) };
    }));
    setMisGrupos(grupos);
    setLoading(false);
  };

  const cargarPostsDeGrupo = async (grupo: any) => {
    setGrupoSeleccionado(grupo);
    const emails = grupo.miembros.map((m: any) => m.email);
    if (emails.length === 0) { setPosts([]); return; }
    const snap = await getDocs(collection(db, "posts"));
    const data = snap.docs
      .filter(d => emails.includes(d.data().email))
      .map(d => ({ id: d.id, ...d.data() }));
    setPosts(data);
    const cals: any = {};
    data.forEach((p: any) => { if (p.calificacion) cals[p.id] = p.calificacion; });
    setCalificaciones(cals);
  };

  const calificar = async (postId: string, postAutorEmail: string, cal: number) => {
    await updateDoc(doc(db, "posts", postId), { calificacion: cal });
    await addDoc(collection(db, "notificaciones"), {
      para: postAutorEmail,
      de: user.displayName || user.email,
      mensaje: `tu maestro calificó tu publicación con ${cal}/10`,
      leida: false,
      fecha: serverTimestamp(),
    });
    setCalificaciones((prev: any) => ({ ...prev, [postId]: cal }));
  };

  const cargarComentarios = async (postId: string) => {
    const snap = await getDocs(collection(db, "posts", postId, "comentarios"));
    setComentarios((prev: any) => ({ ...prev, [postId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
  };

  const toggleComentarios = async (postId: string) => {
    if (!showComentarios[postId]) await cargarComentarios(postId);
    setShowComentarios((prev: any) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const publicarComentario = async (postId: string, postAutorEmail: string) => {
    const texto = nuevoComentario[postId];
    if (!texto?.trim()) return;
    await addDoc(collection(db, "posts", postId, "comentarios"), {
      texto,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: postAutorEmail,
      de: user.displayName || user.email,
      mensaje: `tu maestro comentó tu publicación: "${texto.slice(0, 50)}"`,
      leida: false,
      fecha: serverTimestamp(),
    });
    setNuevoComentario((prev: any) => ({ ...prev, [postId]: "" }));
    await cargarComentarios(postId);
  };

  const coloresTipo: any = {
    "Diario": "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
    "Planeación": "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    "Narrativa": "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    "Extra": "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
    "Pedir ayuda": "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando panel maestro...</p>
      </div>
    </div>
  );

  if (accesoDenegado) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center max-w-sm shadow-2xl">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-extrabold text-white mb-2">Acceso denegado</h2>
        <p className="text-sm text-slate-400 mb-6">Solo los maestros registrados pueden ver esta página.</p>
        <button onClick={() => router.push("/")} className="text-sm bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow">
          Volver al inicio
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Maestro" />

      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-xl">
          <GraduationCap size={32} className="text-red-400" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Panel del Maestro</h2>
            <p className="text-sm text-slate-400">{user?.displayName} — {user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Users2 size={14} className="text-red-400" /> Mis grupos</p>
              {misGrupos.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400 mb-3">No tienes grupos todavía.</p>
                  <button onClick={() => router.push("/grupos")} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95">
                    Crear grupo
                  </button>
                </div>
              )}
              {misGrupos.map((grupo) => (
                <div
                  key={grupo.id}
                  onClick={() => cargarPostsDeGrupo(grupo)}
                  className={`p-3 rounded-xl cursor-pointer transition mb-2 ${grupoSeleccionado?.id === grupo.id ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40" : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"}`}
                >
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{grupo.nombre}</p>
                  <p className="text-xs text-slate-400">{grupo.miembros?.length || 0} alumnos</p>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            {!grupoSeleccionado && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
                Selecciona un grupo para ver las publicaciones de tus alumnos.
              </div>
            )}
            {grupoSeleccionado && posts.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
                Los alumnos de este grupo aún no tienen publicaciones.
              </div>
            )}
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold">
                      {post.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{post.autor}</p>
                      <p className="text-xs text-slate-400">{post.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                    {post.tipo}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{post.contenido}</p>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1"><Star size={13} className="text-amber-500" /> Calificación</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <button
                        key={n}
                        onClick={() => calificar(post.id, post.email, n)}
                        className={`w-8 h-8 rounded-lg text-xs font-extrabold transition ${calificaciones[post.id] === n ? "bg-green-600 text-white scale-110" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-green-50 hover:text-green-600 border border-slate-200 dark:border-slate-800"}`}
                      >
                        {n}
                      </button>
                    ))}
                    {calificaciones[post.id] && (
                      <span className="ml-2 text-sm font-extrabold text-green-600">{calificaciones[post.id]}/10 ✓</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button onClick={() => toggleComentarios(post.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-500 font-semibold transition">
                    <MessageCircle size={14} /> {showComentarios[post.id] ? "Ocultar" : "Comentar como maestro"}
                  </button>
                </div>

                {showComentarios[post.id] && (
                  <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {comentarios[post.id]?.map((c: any) => (
                      <div key={c.id} className="flex gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.autor?.charAt(0).toUpperCase()}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                          <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{c.autor}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{c.texto}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Escribe tu retroalimentación..."
                        value={nuevoComentario[post.id] || ""}
                        onChange={(e) => setNuevoComentario((prev: any) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && publicarComentario(post.id, post.email)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400"
                      />
                      <button
                        onClick={() => publicarComentario(post.id, post.email)}
                        className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95"
                      >
                        <Send size={13} /> Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}