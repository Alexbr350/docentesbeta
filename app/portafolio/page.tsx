"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import Navbar from "../components/Navbar";
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";

export default function Portafolio() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/landing");
      } else {
        setUser(user);
        cargarMisPosts(user.email || "");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const cargarMisPosts = async (email: string) => {
    const q = query(
      collection(db, "posts"),
      where("email", "==", email),
      orderBy("fecha", "desc")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPosts(data);
    setLoading(false);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación?")) return;
    await deleteDoc(doc(db, "posts", id));
    setPosts(posts.filter((p) => p.id !== id));
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

  const iconosTipo: any = {
    "Diario": "📓",
    "Planeación": "📋",
    "Narrativa": "✍️",
    "Extra": "📎",
    "Pedir ayuda": "❓",
  };

  const tipos = ["Todos", "Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"];
  const postsFiltrados = filtro === "Todos" ? posts : posts.filter((p) => p.tipo === filtro);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando portafolio...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">

     <Navbar paginaActual="Portafolio" />

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header perfil */}
        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center gap-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-lg flex-shrink-0">
            {user?.displayName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-white">{user?.displayName || "Practicante"}</h2>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Practicante docente</span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{posts.length} publicaciones</span>
            </div>
          </div>
          <img src="/logo.png" alt="ENSFA" className="w-12 h-12 rounded-full opacity-60" />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"].map((tipo) => (
            <div key={tipo} className="bg-white rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition">
              <div className="text-2xl mb-1">{iconosTipo[tipo]}</div>
              <div className="text-2xl font-extrabold text-gray-800">
                {posts.filter((p) => p.tipo === tipo).length}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">{tipo}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-5">
          {tipos.map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltro(tipo)}
              className={`text-xs px-4 py-1.5 rounded-full border transition font-semibold ${filtro === tipo ? "bg-slate-900 text-white border-slate-900 shadow-md" : "border-slate-200 text-slate-500 bg-white hover:border-slate-400"}`}
            >
              {tipo !== "Todos" && iconosTipo[tipo]} {tipo} {tipo !== "Todos" && `(${posts.filter((p) => p.tipo === tipo).length})`}
            </button>
          ))}
        </div>

        {/* Publicaciones */}
        {postsFiltrados.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
            No tienes publicaciones de tipo "{filtro}" todavía.
          </div>
        )}
        {postsFiltrados.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{iconosTipo[post.tipo]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 text-slate-600"}`}>
                  {post.tipo}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">
                  {post.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => eliminar(post.id)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium hover:bg-red-50 px-2 py-1 rounded-lg transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
           <p className="text-sm text-slate-700 leading-relaxed">{post.contenido}</p>
{post.archivoUrl && (
  <a href={post.archivoUrl} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition mt-3">
    📎 {post.archivoNombre || "Ver archivo adjunto"}
  </a>
)}
{post.calificacion && (
  <div className="flex items-center gap-2 mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
    <span className="text-xs font-bold text-blue-600">⭐ Calificación del evaluador:</span>
    <span className="text-lg font-extrabold text-blue-700">{post.calificacion}/10</span>
  </div>
)}
          </div>
        ))}
      </div>
    </div>
  );
}