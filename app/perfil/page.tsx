"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export default function Perfil() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/landing");
      } else {
        setUser(user);
        cargarPosts(user.email || "");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const cargarPosts = async (email: string) => {
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const tipos = ["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"];
  const iconosTipo: any = {
    "Diario": "📓", "Planeación": "📋", "Narrativa": "✍️", "Extra": "📎", "Pedir ayuda": "❓",
  };
  const coloresTipo: any = {
    "Diario": "bg-blue-100 text-blue-700",
    "Planeación": "bg-indigo-100 text-indigo-700",
    "Narrativa": "bg-amber-100 text-amber-700",
    "Extra": "bg-cyan-100 text-cyan-700",
    "Pedir ayuda": "bg-red-100 text-red-700",
  };
  const metas: any = { "Diario": 10, "Planeación": 5, "Narrativa": 1, "Extra": 3, "Pedir ayuda": 99 };
  const barraColores: any = { "Diario": "bg-blue-500", "Planeación": "bg-indigo-500", "Narrativa": "bg-amber-500", "Extra": "bg-cyan-500" };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando perfil...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Navbar */}
      <nav className="bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA</p>
            <h1 className="text-sm font-bold text-white leading-tight">Docentes<span className="text-blue-400">Beta</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["Feed", "Portafolio", "Comunidad", "Perfil", "Usuarios"].map((item) => (
            <button
              key={item}
              onClick={() => item === "Feed" ? router.push("/") : router.push(`/${item.toLowerCase()}`)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${item === "Perfil" ? "text-white bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              {item}
            </button>
          ))}
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Hero perfil */}
        <div className="bg-slate-900 rounded-2xl p-8 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-10"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-xl">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-white">{user?.displayName || "Practicante"}</h2>
              <p className="text-slate-400 mt-0.5">{user?.email}</p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">Practicante docente</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">@ensfa.edu.mx</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">{posts.length} publicaciones</span>
              </div>
            </div>
            <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full opacity-50 hidden md:block" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {tipos.map((tipo) => (
            <div key={tipo} className="bg-white rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition">
              <div className="text-2xl mb-1">{iconosTipo[tipo]}</div>
              <div className="text-2xl font-extrabold text-gray-800">{posts.filter((p) => p.tipo === tipo).length}</div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">{tipo}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">

          {/* Progreso */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-extrabold text-gray-800 mb-5">📊 Mi progreso</h3>
            {["Diario", "Planeación", "Narrativa", "Extra"].map((tipo) => {
              const count = posts.filter((p) => p.tipo === tipo).length;
              const pct = Math.min((count / metas[tipo]) * 100, 100);
              return (
                <div key={tipo} className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-700">{iconosTipo[tipo]} {tipo}</span>
                    <span className="text-slate-400 font-medium">{count}/{metas[tipo]}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barraColores[tipo]} rounded-full transition-all shadow-sm`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{pct.toFixed(0)}% completado</p>
                </div>
              );
            })}
          </div>

          {/* Últimas publicaciones */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-extrabold text-gray-800 mb-5">📰 Últimas publicaciones</h3>
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="flex items-start gap-3 mb-4 pb-4 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0">
                <span className="text-lg flex-shrink-0">{iconosTipo[post.tipo]}</span>
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 text-slate-600"}`}>
                    {post.tipo}
                  </span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">{post.contenido}</p>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aún no tienes publicaciones.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}