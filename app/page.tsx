"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, updateDoc, where } from "firebase/firestore";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("Diario");
  const [contenido, setContenido] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [comentarios, setComentarios] = useState<any>({});
  const [showComentarios, setShowComentarios] = useState<any>({});
  const [nuevoComentario, setNuevoComentario] = useState<any>({});
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        setLoading(false);
        cargarPosts();
        cargarNotificaciones(user.email || "");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const cargarPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPosts(data);
  };

  const cargarNotificaciones = async (email: string) => {
    const q = query(
      collection(db, "notificaciones"),
      where("para", "==", email),
      orderBy("fecha", "desc")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setNotificaciones(data);
  };

  const marcarLeidas = async () => {
    const noLeidas = notificaciones.filter((n) => !n.leida);
    for (const n of noLeidas) {
      await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
    }
    setNotificaciones(notificaciones.map((n) => ({ ...n, leida: true })));
  };

  const cargarComentarios = async (postId: string) => {
    const q = query(collection(db, "posts", postId, "comentarios"), orderBy("fecha", "asc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setComentarios((prev: any) => ({ ...prev, [postId]: data }));
  };

  const toggleComentarios = async (postId: string) => {
    if (!showComentarios[postId]) {
      await cargarComentarios(postId);
    }
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
    if (postAutorEmail !== user.email) {
      await addDoc(collection(db, "notificaciones"), {
        para: postAutorEmail,
        de: user.displayName || user.email,
        mensaje: `comentó en tu publicación: "${texto.slice(0, 50)}..."`,
        leida: false,
        fecha: serverTimestamp(),
      });
    }
    setNuevoComentario((prev: any) => ({ ...prev, [postId]: "" }));
    await cargarComentarios(postId);
  };

  const publicar = async () => {
    if (!contenido.trim()) return;
    setPublicando(true);
    await addDoc(collection(db, "posts"), {
      tipo: tipoSeleccionado,
      contenido,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
    });
    setContenido("");
    setShowComposer(false);
    setPublicando(false);
    cargarPosts();
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
    "Actividad": "bg-green-100 text-green-700",
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Docentes<span className="text-green-600">Beta</span></h1>
        <div className="flex items-center gap-4">
        <input
  type="text"
  placeholder="Buscar..."
  value={busqueda}
  onChange={(e) => setBusqueda(e.target.value)}
  className="bg-gray-100 text-sm px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 w-48"
/>
          <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-800">Feed</button>
          <button onClick={() => router.push("/portafolio")} className="text-sm text-gray-500 hover:text-gray-800">Mi portafolio</button>
          <button onClick={() => router.push("/comunidad")} className="text-sm text-gray-500 hover:text-gray-800">Comunidad</button>
          <button onClick={() => router.push("/perfil")} className="text-sm text-gray-500 hover:text-gray-800">Mi perfil</button>
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) marcarLeidas(); }}
            className="relative text-sm text-gray-500 hover:text-gray-800"
          >
            🔔
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {noLeidas}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Cerrar sesión</button>
        </div>
      </nav>

      {/* Panel de notificaciones */}
      {showNotif && (
        <div className="fixed top-14 right-4 w-80 bg-white rounded-2xl border border-gray-200 shadow-lg z-20 p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Notificaciones</h3>
          {notificaciones.length === 0 && (
            <p className="text-xs text-gray-400">No tienes notificaciones.</p>
          )}
          {notificaciones.map((n) => (
            <div key={n.id} className={`mb-3 p-3 rounded-xl text-xs ${n.leida ? "bg-gray-50" : "bg-green-50 border border-green-100"}`}>
              <span className="font-medium text-gray-800">{n.de}</span>
              <span className="text-gray-600"> {n.mensaje}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-4 gap-6">

        <div className="col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-medium text-gray-800">{user?.displayName || "Practicante"}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase mb-2">Mi espacio</p>
            <div className="flex flex-col gap-1">
              {["Feed", "Diarios", "Planeaciones", "Narrativa", "Extras"].map((item) => (
                <button
                  key={item}
                  onClick={() => item === "Feed" ? router.push("/") : router.push("/portafolio")}
                  className="text-left px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
                  {item}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 uppercase mt-4 mb-2">Comunidad</p>
            <div className="flex flex-col gap-1">
              {["Preguntas", "Actividades"].map((item) => (
                <button
                  key={item}
                  onClick={() => router.push("/comunidad")}
                  className="text-left px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <div className="flex gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div
                className="flex-1 bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-400 border border-gray-200 cursor-pointer hover:border-green-400"
                onClick={() => setShowComposer(true)}
              >
                ¿Qué quieres publicar hoy?
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"].map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => { setTipoSeleccionado(tipo); setShowComposer(true); }}
                  className={`text-xs px-3 py-1 rounded-full border transition ${tipoSeleccionado === tipo && showComposer ? "border-green-500 text-green-600 bg-green-50" : "border-gray-200 text-gray-500 hover:border-green-500 hover:text-green-600"}`}
                >
                  {tipo}
                </button>
              ))}
            </div>

            {showComposer && (
              <div className="mt-4">
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:border-green-400"
                  rows={4}
                  placeholder={`Escribe tu ${tipoSeleccionado.toLowerCase()} aquí...`}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setShowComposer(false); setContenido(""); }}
                    className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={publicar}
                    disabled={publicando || !contenido.trim()}
                    className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {publicando ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {posts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              Aún no hay publicaciones. ¡Sé el primero en publicar!
            </div>
          )}
         {posts.filter((post) =>
  post.contenido?.toLowerCase().includes(busqueda.toLowerCase()) ||
  post.autor?.toLowerCase().includes(busqueda.toLowerCase()) ||
  post.tipo?.toLowerCase().includes(busqueda.toLowerCase())
).map((post) => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold">
                  {post.autor?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{post.autor}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresTipo[post.tipo] || "bg-gray-100 text-gray-600"}`}>{post.tipo}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.contenido}</p>
              <div className="flex gap-2 border-t border-gray-100 pt-3">
                <button
                  onClick={() => toggleComentarios(post.id)}
                  className="text-xs text-gray-400 hover:text-blue-500"
                >
                  💬 {showComentarios[post.id] ? "Ocultar" : "Comentar"}
                </button>
              </div>

              {showComentarios[post.id] && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {comentarios[post.id]?.length === 0 && (
                    <p className="text-xs text-gray-400 mb-3">Aún no hay comentarios.</p>
                  )}
                  {comentarios[post.id]?.map((c: any) => (
                    <div key={c.id} className="flex gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
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
                      placeholder="Escribe un comentario..."
                      value={nuevoComentario[post.id] || ""}
                      onChange={(e) => setNuevoComentario((prev: any) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && publicarComentario(post.id, post.email)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400"
                    />
                    <button
                      onClick={() => publicarComentario(post.id, post.email)}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase mb-3">Mi avance</p>
            {[
              { label: "Diarios", value: 60, color: "bg-green-500" },
              { label: "Planeaciones", value: 60, color: "bg-purple-500" },
              { label: "Narrativa", value: 100, color: "bg-yellow-500" },
              { label: "Extras", value: 66, color: "bg-blue-500" },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-gray-400">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}