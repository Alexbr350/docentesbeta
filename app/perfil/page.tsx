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
        router.push("/login");
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
    router.push("/login");
  };

  const tipos = ["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"];

  const coloresTipo: any = {
    "Diario": "bg-blue-100 text-blue-700",
    "Planeación": "bg-purple-100 text-purple-700",
    "Narrativa": "bg-yellow-100 text-yellow-700",
    "Extra": "bg-blue-100 text-blue-700",
    "Pedir ayuda": "bg-red-100 text-red-700",
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Cargando perfil...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Docentes<span className="text-green-600">Beta</span></h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-800">Feed</button>
          <button onClick={() => router.push("/portafolio")} className="text-sm text-gray-500 hover:text-gray-800">Mi portafolio</button>
          <button onClick={() => router.push("/comunidad")} className="text-sm text-gray-500 hover:text-gray-800">Comunidad</button>
          <button onClick={() => router.push("/perfil")} className="text-sm text-green-600 font-medium">Mi perfil</button>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Tarjeta de perfil */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl font-semibold mx-auto mb-4">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-semibold text-gray-800">{user?.displayName || "Practicante"}</h2>
          <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          <div className="flex justify-center gap-2 mt-4">
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">Practicante docente</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">@ensfa.edu.mx</span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {tipos.map((tipo) => (
            <div key={tipo} className={`bg-white rounded-2xl border border-gray-200 p-4 text-center`}>
              <div className="text-2xl font-semibold text-gray-800">
                {posts.filter((p) => p.tipo === tipo).length}
              </div>
              <div className="text-xs text-gray-400 mt-1">{tipo}</div>
            </div>
          ))}
        </div>

        {/* Barra de progreso general */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Mi progreso</h3>
          {[
            { label: "Diarios", tipo: "Diario", meta: 10, color: "bg-blue-500" },
            { label: "Planeaciones", tipo: "Planeación", meta: 5, color: "bg-purple-500" },
            { label: "Narrativa", tipo: "Narrativa", meta: 1, color: "bg-yellow-500" },
            { label: "Extras", tipo: "Extra", meta: 3, color: "bg-green-500" },
          ].map((item) => {
            const count = posts.filter((p) => p.tipo === item.tipo).length;
            const pct = Math.min((count / item.meta) * 100, 100);
            return (
              <div key={item.label} className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{item.label}</span>
                  <span className="text-gray-400">{count}/{item.meta}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Últimas publicaciones */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Últimas publicaciones</h3>
          {posts.slice(0, 5).map((post) => (
            <div key={post.id} className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${coloresTipo[post.tipo] || "bg-gray-100 text-gray-600"}`}>
                {post.tipo}
              </span>
              <p className="text-sm text-gray-600 line-clamp-2">{post.contenido}</p>
            </div>
          ))}
          {posts.length === 0 && (
            <p className="text-sm text-gray-400 text-center">Aún no tienes publicaciones.</p>
          )}
        </div>

      </div>
    </div>
  );
}