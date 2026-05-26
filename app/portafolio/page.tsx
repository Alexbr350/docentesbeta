"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
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
        router.push("/login");
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
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    router.push("/login");
  };

  const coloresTipo: any = {
    "Diario": "bg-blue-100 text-blue-700",
    "Planeación": "bg-purple-100 text-purple-700",
    "Narrativa": "bg-yellow-100 text-yellow-700",
    "Extra": "bg-blue-100 text-blue-700",
    "Pedir ayuda": "bg-red-100 text-red-700",
  };

  const tipos = ["Todos", "Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"];
  const postsFiltrados = filtro === "Todos" ? posts : posts.filter((p) => p.tipo === filtro);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Cargando portafolio...</p>
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
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-semibold">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{user?.displayName || "Practicante"}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-green-600 mt-1">{posts.length} publicaciones en total</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"].map((tipo) => (
            <div key={tipo} className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-semibold text-gray-800">
                {posts.filter((p) => p.tipo === tipo).length}
              </div>
              <div className="text-xs text-gray-400 mt-1">{tipo}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-4">
          {tipos.map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltro(tipo)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${filtro === tipo ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-500 hover:border-green-400"}`}
            >
              {tipo} {tipo !== "Todos" && `(${posts.filter((p) => p.tipo === tipo).length})`}
            </button>
          ))}
        </div>

        {/* Lista de publicaciones */}
        {postsFiltrados.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No tienes publicaciones de tipo "{filtro}" todavía.
          </div>
        )}
        {postsFiltrados.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresTipo[post.tipo] || "bg-gray-100 text-gray-600"}`}>
                {post.tipo}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {post.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => eliminar(post.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{post.contenido}</p>
          </div>
        ))}
      </div>
    </div>
  );
}