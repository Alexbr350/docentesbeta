"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, updateDoc, where, deleteDoc, setDoc } from "firebase/firestore";

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
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [likes, setLikes] = useState<any>({});
  const [dislikes, setDislikes] = useState<any>({});
  const [amigos, setAmigos] = useState<string[]>([]);
  const [misGrupos, setMisGrupos] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/landing");
      } else {
        setUser(currentUser);
        setLoading(false);
        cargarPosts();
        cargarNotificaciones(currentUser.email || "");
        cargarAmigos(currentUser.email || "");
        cargarGrupos(currentUser.email || "");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const reportarPost = async (postId: string, autorNombre: string, autorEmail: string) => {
    const motivo = prompt("¿Por qué quieres reportar esta publicación? (motivo breve)");
    if (!motivo?.trim()) return;
    await addDoc(collection(db, "reportes"), {
      tipo: "publicacion",
      postId,
      autorReportado: autorNombre,
      emailReportado: autorEmail,
      reportadoPor: user.displayName || user.email,
      emailReportadoPor: user.email,
      motivo,
      estado: "pendiente",
      fecha: serverTimestamp(),
    });
    alert("Reporte enviado al evaluador. Gracias por ayudarnos a mantener la comunidad segura.");
  };

  const darLike = async (postId: string, postAutorEmail: string) => {
    const likeRef = doc(db, "posts", postId, "likes", user.email);
    if (likes[postId]) {
      await deleteDoc(likeRef);
      setLikes((prev: any) => ({ ...prev, [postId]: false }));
    } else {
      await setDoc(likeRef, { email: user.email, fecha: serverTimestamp() });
      setLikes((prev: any) => ({ ...prev, [postId]: true }));
      if (postAutorEmail !== user.email) {
        await addDoc(collection(db, "notificaciones"), {
          para: postAutorEmail,
          de: user.displayName || user.email,
          mensaje: "le dio ❤️ a tu publicación",
          leida: false,
          fecha: serverTimestamp(),
        });
      }
    }
  };

  const darDislike = async (postId: string) => {
    if (!user?.email) return;
    const dislikeRef = doc(db, "posts", postId, "dislikes", user.email);
    if (dislikes[postId]) {
      await deleteDoc(dislikeRef);
      setDislikes((prev: any) => ({ ...prev, [postId]: false }));
      setPosts(posts.map(p => p.id === postId ? { ...p, dislikesCount: (p.dislikesCount || 1) - 1 } : p));
    } else {
      await setDoc(dislikeRef, { email: user.email, fecha: serverTimestamp() });
      setDislikes((prev: any) => ({ ...prev, [postId]: true }));
      setPosts(posts.map(p => p.id === postId ? { ...p, dislikesCount: (p.dislikesCount || 0) + 1 } : p));
    }
  };

  const cargarPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const data = await Promise.all(snapshot.docs.map(async (d) => {
      const likesSnap = await getDocs(collection(db, "posts", d.id, "likes"));
      const dislikesSnap = await getDocs(collection(db, "posts", d.id, "dislikes"));
      return { id: d.id, likesCount: likesSnap.docs.length, dislikesCount: dislikesSnap.docs.length, ...d.data() };
    }));
    setPosts(data);
  };

  const cargarNotificaciones = async (email: string) => {
    const q = query(collection(db, "notificaciones"), where("para", "==", email), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    setNotificaciones(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    setComentarios((prev: any) => ({ ...prev, [postId]: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) }));
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
    if (postAutorEmail !== user.email) {
      await addDoc(collection(db, "notificaciones"), {
        para: postAutorEmail,
        de: user.displayName || user.email,
        mensaje: `comentó en tu publicación: "${texto.slice(0, 50)}"`,
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
    let archivoUrl = null;
    let archivoNombre = null;
    if (archivoSeleccionado) {
      const formData = new FormData();
      formData.append("file", archivoSeleccionado);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      archivoUrl = data.secure_url;
      archivoNombre = archivoSeleccionado.name;
    }
    await addDoc(collection(db, "posts"), {
      tipo: tipoSeleccionado,
      contenido,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
      ...(archivoUrl && { archivoUrl, archivoNombre }),
    });
    setContenido("");
    setArchivoSeleccionado(null);
    setShowComposer(false);
    setPublicando(false);
    cargarPosts();
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const cargarGrupos = async (email: string) => {
    const snap = await getDocs(collection(db, "grupos"));
    const grupos = await Promise.all(snap.docs.map(async (d) => {
      const miembrosSnap = await getDocs(collection(db, "grupos", d.id, "miembros"));
      const esMiembro = miembrosSnap.docs.find(m => m.data().email === email);
      if (esMiembro) return { id: d.id, ...d.data() };
      return null;
    }));
    setMisGrupos(grupos.filter(Boolean));
  };

  const cargarAmigos = async (email: string) => {
    const snap = await getDocs(query(collection(db, "amigos"), where("usuario", "==", email)));
    setAmigos(snap.docs.map((d) => d.data().amigo));
  };

  const coloresTipo: any = {
    "Diario": "bg-blue-100 text-blue-700",
    "Planeación": "bg-indigo-100 text-indigo-700",
    "Narrativa": "bg-amber-100 text-amber-700",
    "Extra": "bg-cyan-100 text-cyan-700",
    "Pedir ayuda": "bg-red-100 text-red-700",
    "Actividad": "bg-emerald-100 text-emerald-700",
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const postsFiltrados = posts
    .filter((post) =>
      post.contenido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      post.autor?.toLowerCase().includes(busqueda.toLowerCase()) ||
      post.tipo?.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => {
      const aEsAmigo = amigos.includes(a.email) ? 1 : 0;
      const bEsAmigo = amigos.includes(b.email) ? 1 : 0;
      return bEsAmigo - aEsAmigo;
    });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando DocentesBeta...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">

      <nav className="bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA</p>
            <h1 className="text-sm font-bold text-white leading-tight">Docentes<span className="text-blue-400">Beta</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 w-40 placeholder-slate-500"
          />
          {["Feed", "Portafolio", "Comunidad", "Perfil", "Usuarios"].map((item) => (
            <button
              key={item}
              onClick={() => item === "Feed" ? router.push("/") : router.push(`/${item.toLowerCase()}`)}
              className="text-xs text-slate-400 hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) marcarLeidas(); }}
            className="relative text-lg px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            🔔
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {noLeidas}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
            Salir
          </button>
        </div>
      </nav>

      {showNotif && (
        <div className="fixed top-14 right-4 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-20 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">🔔 Notificaciones</h3>
          {notificaciones.length === 0 && <p className="text-xs text-gray-400">No tienes notificaciones.</p>}
          {notificaciones.map((n) => (
            <div key={n.id} className={`mb-2 p-3 rounded-xl text-xs ${n.leida ? "bg-slate-50" : "bg-blue-50 border border-blue-100"}`}>
              <span className="font-bold text-gray-800">{n.de}</span>
              <span className="text-gray-600"> {n.mensaje}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-4 gap-5">

        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-4 mb-4 text-center shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-extrabold mx-auto mb-3 shadow-lg">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-bold text-gray-800">{user?.displayName || "Practicante"}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
            <span className="inline-block mt-2 text-xs bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full font-medium">Practicante</span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mi espacio</p>
            <div className="flex flex-col gap-0.5">
              {[
                { label: "📰 Feed", path: "/" },
                { label: "📁 Portafolio", path: "/portafolio" },
                { label: "👤 Perfil", path: "/perfil" },
              ].map((item) => (
                <button key={item.label} onClick={() => router.push(item.path)}
                  className="text-left px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition font-medium">
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-3">Comunidad</p>
            <div className="flex flex-col gap-0.5">
              {[
                { label: "❓ Preguntas", path: "/comunidad" },
                { label: "💡 Actividades", path: "/comunidad" },
              ].map((item) => (
                <button key={item.label} onClick={() => router.push(item.path)}
                  className="text-left px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition font-medium">
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-md">
            <div className="flex gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0 shadow">
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>
              <div
                className="flex-1 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-400 border border-slate-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
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
                  className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${tipoSeleccionado === tipo && showComposer ? "border-blue-500 text-blue-600 bg-blue-50" : "border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600"}`}
                >
                  {tipo}
                </button>
              ))}
            </div>
            {showComposer && (
              <div className="mt-4">
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-blue-400"
                  rows={4}
                  placeholder={`Escribe tu ${tipoSeleccionado.toLowerCase()} aquí...`}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                />
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:border-blue-400 transition">
                    📎 Adjuntar
                    <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)} />
                  </label>
                  {archivoSeleccionado && <span className="text-xs text-blue-600 font-medium">✓ {archivoSeleccionado.name}</span>}
                  <div className="flex justify-end gap-2 ml-auto">
                    <button onClick={() => { setShowComposer(false); setContenido(""); setArchivoSeleccionado(null); }} className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2">Cancelar</button>
                    <button
                      onClick={publicar}
                      disabled={publicando || !contenido.trim()}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow"
                    >
                      {publicando ? "Publicando..." : "Publicar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {postsFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
              {busqueda ? `No se encontraron resultados para "${busqueda}"` : "Aún no hay publicaciones. ¡Sé el primero!"}
            </div>
          )}
          {postsFiltrados.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                  {post.autor?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{post.autor}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 text-slate-600"}`}>{post.tipo}</span>
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">{post.contenido}</p>
              {post.archivoUrl && (
                <a href={post.archivoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition mb-3">
                  📎 {post.archivoNombre || "Ver archivo adjunto"}
                </a>
              )}
              <div className="flex gap-3 border-t border-slate-100 pt-3 items-center">
                <button
                  onClick={() => darLike(post.id, post.email)}
                  className={`text-xs font-semibold transition-all duration-200 ${likes[post.id] ? "text-red-500 scale-110" : "text-slate-400 hover:text-red-500"}`}
                >
                  ❤️ {post.likesCount || 0}
                </button>
                {post.email === user?.email && (
                  <span className="text-xs text-slate-400 font-semibold">👎 {post.dislikesCount || 0}</span>
                )}
                {post.email !== user?.email && (
                  <button
                    onClick={() => darDislike(post.id)}
                    className={`text-xs font-semibold transition-all duration-200 ${dislikes[post.id] ? "text-slate-700 scale-110" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    👎
                  </button>
                )}
                <button onClick={() => toggleComentarios(post.id)} className="text-xs text-slate-400 hover:text-blue-500 font-semibold transition">
                  💬 {showComentarios[post.id] ? "Ocultar" : "Comentar"}
                </button>
                {post.email !== user?.email && (
                  <button
                    onClick={() => reportarPost(post.id, post.autor, post.email)}
                    className="text-xs text-slate-400 hover:text-orange-500 font-semibold transition ml-auto"
                  >
                    🚩 Reportar
                  </button>
                )}
              </div>
              {showComentarios[post.id] && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {comentarios[post.id]?.length === 0 && <p className="text-xs text-slate-400 mb-3">Aún no hay comentarios.</p>}
                  {comentarios[post.id]?.map((c: any) => (
                    <div key={c.id} className="flex gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                      placeholder="Escribe un comentario..."
                      value={nuevoComentario[post.id] || ""}
                      onChange={(e) => setNuevoComentario((prev: any) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && publicarComentario(post.id, post.email)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                    />
                    <button onClick={() => publicarComentario(post.id, post.email)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold">
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mi avance</p>
            {[
              { label: "Diarios", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Diario").length / 10) * 100, 100), color: "bg-blue-500" },
              { label: "Planeaciones", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Planeación").length / 5) * 100, 100), color: "bg-indigo-500" },
              { label: "Narrativa", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Narrativa").length / 1) * 100, 100), color: "bg-amber-500" },
              { label: "Extras", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Extra").length / 3) * 100, 100), color: "bg-cyan-500" },
            ].map((item) => (
              <div key={item.label} className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-700 font-semibold">{item.label}</span>
                  <span className="text-slate-400">{item.value.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full shadow-sm`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 mt-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mis grupos</p>
            {misGrupos.length === 0 && <p className="text-xs text-slate-400">No perteneces a ningún grupo.</p>}
            {misGrupos.map((grupo: any) => (
              <div key={grupo.id} className="flex items-center gap-2 mb-2 p-2 rounded-xl hover:bg-blue-50 cursor-pointer transition" onClick={() => router.push("/grupos")}>
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">👥</div>
                <p className="text-xs font-semibold text-slate-700">{grupo.nombre}</p>
              </div>
            ))}
            <button onClick={() => router.push("/grupos")} className="text-xs text-blue-500 hover:text-blue-700 font-semibold mt-2">
              Ver todos →
            </button>
          </div>
          <div className="bg-slate-900 rounded-2xl p-4 mt-4 shadow-md text-center">
            <img src="/logo.png" alt="ENSFA" className="w-12 h-12 rounded-full mx-auto mb-2 opacity-90" />
            <p className="text-xs font-bold text-white">ENSFA</p>
            <p className="text-xs text-slate-400 mt-0.5">Aguascalientes</p>
          </div>
        </div>

      </div>
    </div>
  );
}