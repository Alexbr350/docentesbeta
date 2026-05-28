"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp } from "firebase/firestore";

const ADMINS = [
  // Aquí irán los correos de los evaluadores
  // Ejemplo: "evaluador@ensfa.edu.mx"
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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Cargando...</p>
    </div>
  );

  if (accesoDenegado) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Acceso denegado</h2>
        <p className="text-sm text-gray-500 mb-4">No tienes permisos para ver esta página.</p>
        <button onClick={() => router.push("/")} className="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">
          Volver al inicio
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Docentes<span className="text-green-600">Beta</span> <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-1">Evaluador</span></h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className="text-3xl font-semibold text-gray-800">{usuarios.length}</div>
            <div className="text-xs text-gray-400 mt-1">Practicantes</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className="text-3xl font-semibold text-gray-800">{posts.length}</div>
            <div className="text-xs text-gray-400 mt-1">Publicaciones totales</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className="text-3xl font-semibold text-gray-800">{posts.filter(p => p.tipo === "Diario").length}</div>
            <div className="text-xs text-gray-400 mt-1">Diarios</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {["publicaciones", "practicantes"].map((v) => (
            <button
              key={v}
              onClick={() => setVistaActual(v)}
              className={`text-sm px-4 py-2 rounded-xl border transition ${vistaActual === v ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-500 hover:border-green-400"}`}
            >
              {v === "publicaciones" ? "📋 Todas las publicaciones" : "👥 Practicantes"}
            </button>
          ))}
        </div>

        {/* Vista practicantes */}
        {vistaActual === "practicantes" && (
          <div>
            {usuarios.map((u) => (
              <div key={u.email} className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
                      {u.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.nombre}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-800">{u.publicaciones}</p>
                    <p className="text-xs text-gray-400">publicaciones</p>
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
              <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold">
                      {post.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{post.autor}</p>
                      <p className="text-xs text-gray-400">{post.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresTipo[post.tipo] || "bg-gray-100 text-gray-600"}`}>
                    {post.tipo}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.contenido}</p>
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => toggleComentarios(post.id)}
                    className="text-xs text-gray-400 hover:text-blue-500"
                  >
                    💬 {showComentarios[post.id] ? "Ocultar" : "Comentar como evaluador"}
                  </button>
                </div>

                {showComentarios[post.id] && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {comentarios[post.id]?.map((c: any) => (
                      <div key={c.id} className="flex gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {c.autor?.charAt(0).toUpperCase()}
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                          <p className="text-xs font-medium text-gray-700">{c.autor}</p>
                          <p className="text-xs text-gray-600">{c.texto}</p>
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
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                      />
                      <button
                        onClick={() => publicarComentario(post.id, post.email)}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl"
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