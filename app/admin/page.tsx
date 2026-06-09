"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

const ADMINS: string[] = [
  "alejandro_br.his23u@ensfa.edu.mx",
];

export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vistaActual, setVistaActual] = useState("publicaciones");
  const [comentarios, setComentarios] = useState<any>({});
  const [showComentarios, setShowComentarios] = useState<any>({});
  const [nuevoComentario, setNuevoComentario] = useState<any>({});
  const [calificaciones, setCalificaciones] = useState<any>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/landing");
        return;
      }
      if (!ADMINS.includes(user.email || "")) {
        setAccesoDenegado(true);
        setLoading(false);
        return;
      }
      setUser(user);
      setLoading(false);
      cargarPosts();
      cargarUsuarios();
    });
    return () => unsubscribe();
  }, [router]);

  const cargarPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPosts(data);
    const cals: any = {};
    data.forEach((p: any) => { if (p.calificacion) cals[p.id] = p.calificacion; });
    setCalificaciones(cals);
  };

  const cargarUsuarios = async () => {
    const snapshot = await getDocs(collection(db, "posts"));
    const emails = [...new Set(snapshot.docs.map((d) => d.data().email))];
    const data = emails.map((email) => ({
      email,
      nombre: snapshot.docs.find((d) => d.data().email === email)?.data().autor,
      publicaciones: snapshot.docs.filter((d) => d.data().email === email).length,
    }));
    setUsuarios(data);
  };

  const cargarComentarios = async (postId: string) => {
    const q = query(collection(db, "posts", postId, "comentarios"), orderBy("fecha", "asc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setComentarios((prev: any) => ({ ...prev, [postId]: data }));
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
      mensaje: `tu evaluador comentó tu publicación: "${texto.slice(0, 50)}"`,
      leida: false,
      fecha: serverTimestamp(),
    });
    setNuevoComentario((prev: any) => ({ ...prev, [postId]: "" }));
    await cargarComentarios(postId);
  };

  const calificar = async (postId: string, postAutorEmail: string, calificacion: number) => {
    await updateDoc(doc(db, "posts", postId), { calificacion });
    await addDoc(collection(db, "notificaciones"), {
      para: postAutorEmail,
      de: user.displayName || user.email,
      mensaje: `calificó tu publicación con ${calificacion}/10 ⭐`,
      leida: false,
      fecha: serverTimestamp(),
    });
    setCalificaciones((prev: any) => ({ ...prev, [postId]: calificacion }));
    setPosts(posts.map((p) => p.id === postId ? { ...p, calificacion } : p));
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const coloresTipo: any = {
    "Diario": "bg-blue-100 text-blue-700",
    "Planeación": "bg-indigo-100 text-indigo-700",
    "Narrativa": "bg-amber-100 text-amber-700",
    "Extra": "bg-cyan-100 text-cyan-700",
    "Pedir ayuda": "bg-red-100 text-red-700",
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando panel...</p>
      </div>
    </div>
  );

  if (accesoDenegado) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center max-w-sm shadow-2xl">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-extrabold text-white mb-2">Acceso denegado</h2>
        <p className="text-sm text-slate-400 mb-6">No tienes permisos para ver esta página.</p>
        <button onClick={() => router.push("/")} className="text-sm bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow">
          Volver al inicio
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA · Panel Evaluador</p>
            <h1 className="text-sm font-bold text-white leading-tight">Docentes<span className="text-blue-400">Beta</span> <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full ml-1">Admin</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["Feed", "Portafolio", "Comunidad", "Perfil"].map((item) => (
            <button
              key={item}
              onClick={() => item === "Feed" ? router.push("/") : router.push(`/${item.toLowerCase()}`)}
              className="text-xs text-slate-400 hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              {item}
            </button>
          ))}
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-400">{user?.email}</span>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Salir</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { num: usuarios.length, label: "Practicantes", icon: "👥" },
            { num: posts.length, label: "Publicaciones totales", icon: "📋" },
            { num: posts.filter(p => p.calificacion).length, label: "Calificadas", icon: "⭐" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 rounded-2xl p-5 text-center shadow-xl">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl font-extrabold text-white">{s.num}</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {["publicaciones", "practicantes"].map((v) => (
            <button
              key={v}
              onClick={() => setVistaActual(v)}
              className={`text-sm px-5 py-2 rounded-xl border transition font-semibold ${vistaActual === v ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "border-slate-200 text-slate-500 bg-white hover:border-slate-400"}`}
            >
              {v === "publicaciones" ? "📋 Publicaciones" : "👥 Practicantes"}
            </button>
          ))}
        </div>

        {/* Vista practicantes */}
        {vistaActual === "practicantes" && (
          <div>
            {usuarios.map((u) => (
              <div key={u.email} className="bg-white rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center font-extrabold shadow">
                      {u.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{u.nombre}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-gray-800">{u.publicaciones}</p>
                    <p className="text-xs text-slate-400 font-medium">publicaciones</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vista publicaciones */}
        {vistaActual === "publicaciones" && (
          <div>
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                      {post.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{post.autor}</p>
                      <p className="text-xs text-slate-400">{post.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 text-slate-600"}`}>
                    {post.tipo}
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mb-4">{post.contenido}</p>

                {/* Calificación */}
                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">⭐ Calificación</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <button
                        key={n}
                        onClick={() => calificar(post.id, post.email, n)}
                        className={`w-8 h-8 rounded-lg text-xs font-extrabold transition shadow-sm ${calificaciones[post.id] === n ? "bg-blue-600 text-white shadow-md scale-110" : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200"}`}
                      >
                        {n}
                      </button>
                    ))}
                    {calificaciones[post.id] && (
                      <span className="ml-2 text-sm font-extrabold text-blue-600">{calificaciones[post.id]}/10 ✓</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <button
                    onClick={() => toggleComentarios(post.id)}
                    className="text-xs text-slate-400 hover:text-blue-500 font-semibold transition"
                  >
                    💬 {showComentarios[post.id] ? "Ocultar" : "Comentar como evaluador"}
                  </button>
                </div>

                {showComentarios[post.id] && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {comentarios[post.id]?.map((c: any) => (
                      <div key={c.id} className="flex gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.autor?.charAt(0).toUpperCase()}
                        </div>
                        <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1">
                          <p className="text-xs font-bold text-gray-700">{c.autor}</p>
                          <p className="text-xs text-slate-600">{c.texto}</p>
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
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                      />
                      <button
                        onClick={() => publicarComentario(post.id, post.email)}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl font-semibold"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}