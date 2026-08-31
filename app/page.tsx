"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, updateDoc, where, deleteDoc, setDoc } from "firebase/firestore";
import { Heart, ThumbsDown, MessageCircle, Flag, Paperclip, Calendar, ArrowRight, Layers, Repeat2, Globe, Users2, UserCheck, Lock, ChevronDown, Flame, Sparkles } from "lucide-react";
import { calcularRacha } from "./lib/racha";
import Navbar from "./components/Navbar";
import Stories from "./components/Stories";
import InsigniaVerificada, { esAdminOMaestro } from "./components/InsigniaVerificada";
import Tendencias from "./components/Tendencias";
import AmigosSugeridos from "./components/AmigosSugeridos";
import ModalInput from "./components/ModalInput";
import ModalMejorarIA from "./components/ModalMejorarIA";
import { useToast } from "./components/Toast";
import SplashScreen from "./components/SplashScreen";
import { ADMINS as ADMINS_LOCAL } from "./lib/admins";

const PRIVACIDAD_INFO: Record<string, { label: string; desc: string; icono: any }> = {
  publico: { label: "Público", desc: "Todos en la plataforma", icono: Globe },
  amigos: { label: "Solo amigos", desc: "Solo tus amigos", icono: Users2 },
  especifico: { label: "Personas específicas", desc: "Eliges quién puede verlo", icono: UserCheck },
  privado: { label: "Privado", desc: "Solo tú", icono: Lock },
};

const OPCIONES_PRIVACIDAD = ["publico", "amigos", "especifico", "privado"] as const;

function IconoPrivacidad({ valor }: { valor?: string }) {
  if (!valor || valor === "publico") return null;
  const info = PRIVACIDAD_INFO[valor];
  if (!info) return null;
  const Icono = info.icono;
  return (
    <span title={info.label} className="inline-flex items-center gap-1">
      <span>·</span>
      <Icono size={11} />
    </span>
  );
}

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
  const [showModalMejorarIA, setShowModalMejorarIA] = useState(false);
  const [likes, setLikes] = useState<any>({});
  const [dislikes, setDislikes] = useState<any>({});
  const [likeJustPopped, setLikeJustPopped] = useState<Record<string, boolean>>({});
  const [likesComentarios, setLikesComentarios] = useState<any>({});
  const [dislikesComentarios, setDislikesComentarios] = useState<any>({});
  const [likeComentarioJustPopped, setLikeComentarioJustPopped] = useState<Record<string, boolean>>({});
  const [amigos, setAmigos] = useState<string[]>([]);
  const [misGrupos, setMisGrupos] = useState<any[]>([]);
  const [proximoEvento, setProximoEvento] = useState<any>(null);
  const [maestrosEmails, setMaestrosEmails] = useState<string[]>([]);
  const [modalReportar, setModalReportar] = useState<{ postId: string; autorNombre: string; autorEmail: string } | null>(null);
  const [modalCompartir, setModalCompartir] = useState<any>(null);
  const [privacidad, setPrivacidad] = useState<string>("publico");
  const [showPrivacidadMenu, setShowPrivacidadMenu] = useState(false);
  const [visiblePara, setVisiblePara] = useState<string[]>([]);
  const [perfilesFotos, setPerfilesFotos] = useState<Record<string, string>>({});
  const [mostrarSplash, setMostrarSplash] = useState(false);
  const { mostrarToast } = useToast();

  const nombreAmigo = (email: string) => posts.find((p) => p.email === email)?.autor || email;

  useEffect(() => {
    const yaVisto = sessionStorage.getItem("splashMostrado") === "true";
    if (!yaVisto) setMostrarSplash(true);
  }, []);

  const finalizarSplash = () => {
    sessionStorage.setItem("splashMostrado", "true");
    setMostrarSplash(false);
  };

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
        cargarProximoEvento();
        cargarMaestros();
        cargarPerfiles();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const cargarMaestros = async () => {
    const snap = await getDocs(collection(db, "maestros"));
    setMaestrosEmails(snap.docs.map((d) => d.data().email));
  };

  const cargarPerfiles = async () => {
    const snap = await getDocs(collection(db, "perfiles"));
    const mapa: Record<string, string> = {};
    snap.docs.forEach((d) => {
      const data: any = d.data();
      if (data.fotoUrl) mapa[d.id] = data.fotoUrl;
    });
    setPerfilesFotos(mapa);
  };

  const reportarPost = (postId: string, autorNombre: string, autorEmail: string) => {
    setModalReportar({ postId, autorNombre, autorEmail });
  };

  const confirmarReportar = async (motivo: string) => {
    if (!modalReportar) return;
    const { postId, autorNombre, autorEmail } = modalReportar;
    setModalReportar(null);
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
    mostrarToast("Reporte enviado al evaluador. Gracias por ayudarnos a mantener la comunidad segura.");
  };

  const compartirPost = (post: any) => {
    setModalCompartir(post);
  };

  const confirmarCompartir = async (comentarioTexto: string) => {
    if (!modalCompartir) return;
    const post = modalCompartir;
    const comentario = comentarioTexto.trim();
    setModalCompartir(null);
    await addDoc(collection(db, "posts"), {
      tipo: "Compartido",
      contenido: comentario,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
      repostOriginal: {
        autor: post.autor,
        contenido: post.contenido || "",
        tipo: post.tipo,
        postId: post.id,
      },
    });
    if (post.email !== user.email) {
      await addDoc(collection(db, "notificaciones"), {
        para: post.email,
        de: user.displayName || user.email,
        mensaje: "compartió tu publicación",
        leida: false,
        fecha: serverTimestamp(),
      });
    }
    cargarPosts();
  };

  const darLike = async (postId: string, postAutorEmail: string) => {
    const likeRef = doc(db, "posts", postId, "likes", user.email);
    if (likes[postId]) {
      await deleteDoc(likeRef);
      setLikes((prev: any) => ({ ...prev, [postId]: false }));
    } else {
      await setDoc(likeRef, { email: user.email, fecha: serverTimestamp() });
      setLikes((prev: any) => ({ ...prev, [postId]: true }));
      setLikeJustPopped((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => setLikeJustPopped((prev) => ({ ...prev, [postId]: false })), 400);
      if (postAutorEmail !== user.email) {
        await addDoc(collection(db, "notificaciones"), {
          para: postAutorEmail,
          de: user.displayName || user.email,
          mensaje: "le dio like a tu publicación",
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

  const cargarProximoEvento = async () => {
    const hoy = new Date().toISOString().split("T")[0];
    const snap = await getDocs(query(collection(db, "eventos"), orderBy("fechaEvento", "asc")));
    const eventos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const proximo = eventos.find((e: any) => e.fechaEvento >= hoy);
    setProximoEvento(proximo || null);
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
    const data = await Promise.all(snapshot.docs.map(async (d) => {
      const likesSnap = await getDocs(collection(db, "posts", postId, "comentarios", d.id, "likes"));
      const dislikesSnap = await getDocs(collection(db, "posts", postId, "comentarios", d.id, "dislikes"));
      const userLike = likesSnap.docs.find(l => l.id === user?.email);
      const userDislike = dislikesSnap.docs.find(l => l.id === user?.email);
      setLikesComentarios((prev: any) => ({ ...prev, [d.id]: !!userLike }));
      setDislikesComentarios((prev: any) => ({ ...prev, [d.id]: !!userDislike }));
      return { id: d.id, likesCount: likesSnap.docs.length, dislikesCount: dislikesSnap.docs.length, ...d.data() };
    }));
    setComentarios((prev: any) => ({ ...prev, [postId]: data }));
  };

  const darLikeComentario = async (postId: string, comentarioId: string) => {
    if (!user?.email) return;
    const likeRef = doc(db, "posts", postId, "comentarios", comentarioId, "likes", user.email);
    if (likesComentarios[comentarioId]) {
      await deleteDoc(likeRef);
      setLikesComentarios((prev: any) => ({ ...prev, [comentarioId]: false }));
    } else {
      await setDoc(likeRef, { email: user.email, fecha: serverTimestamp() });
      setLikesComentarios((prev: any) => ({ ...prev, [comentarioId]: true }));
      setLikeComentarioJustPopped((prev) => ({ ...prev, [comentarioId]: true }));
      setTimeout(() => setLikeComentarioJustPopped((prev) => ({ ...prev, [comentarioId]: false })), 400);
    }
    await cargarComentarios(postId);
  };

  const darDislikeComentario = async (postId: string, comentarioId: string) => {
    if (!user?.email) return;
    const dislikeRef = doc(db, "posts", postId, "comentarios", comentarioId, "dislikes", user.email);
    if (dislikesComentarios[comentarioId]) {
      await deleteDoc(dislikeRef);
      setDislikesComentarios((prev: any) => ({ ...prev, [comentarioId]: false }));
    } else {
      await setDoc(dislikeRef, { email: user.email, fecha: serverTimestamp() });
      setDislikesComentarios((prev: any) => ({ ...prev, [comentarioId]: true }));
    }
    await cargarComentarios(postId);
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
      privacidad,
      ...(privacidad === "especifico" && { visiblePara }),
      ...(archivoUrl && { archivoUrl, archivoNombre }),
    });
    setContenido("");
    setArchivoSeleccionado(null);
    setShowComposer(false);
    setPublicando(false);
    setPrivacidad("publico");
    setVisiblePara([]);
    setShowPrivacidadMenu(false);
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
    "Diario": "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
    "Planeación": "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    "Narrativa": "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    "Extra": "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
    "Pedir ayuda": "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
    "Actividad": "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    "Compartido": "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400",
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const miRacha = calcularRacha(posts, user?.email || "");

  const postsFiltrados = posts
    .filter((post) => {
      if (post.email === user?.email) return true;
      const nivel = post.privacidad || "publico";
      if (nivel === "publico") return true;
      if (nivel === "amigos") return amigos.includes(post.email);
      if (nivel === "especifico") return (post.visiblePara || []).includes(user?.email);
      if (nivel === "privado") return false;
      return true;
    })
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

  if (mostrarSplash) {
    return <SplashScreen onFinish={finalizarSplash} />;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando ENSFA+...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">

      <Navbar paginaActual="Feed" />

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-5">

        <div className="col-span-1 order-2 md:order-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 text-center shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-extrabold mx-auto mb-3 shadow-lg overflow-hidden">
              {perfilesFotos[user?.email || ""] ? (
                <img src={perfilesFotos[user?.email || ""]} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase()
              )}
            </div>
            <p className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center justify-center gap-1">
              {user?.displayName || "Practicante"}
              {ADMINS_LOCAL.includes(user?.email) && <InsigniaVerificada tipo="admin" />}
              {!ADMINS_LOCAL.includes(user?.email) && maestrosEmails.includes(user?.email) && <InsigniaVerificada tipo="maestro" />}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">{user?.email}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              <span className="inline-block text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-0.5 rounded-full font-medium">Practicante</span>
              <span
                title={miRacha > 0 ? `Racha de ${miRacha} ${miRacha === 1 ? "día" : "días"}` : "Publica hoy para empezar tu racha"}
                className={`inline-flex items-center gap-1 text-xs px-3 py-0.5 rounded-full font-bold ${miRacha > 0 ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
              >
                <Flame size={12} className={miRacha > 0 ? "fill-orange-500 text-orange-500" : ""} />
                {miRacha}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mi espacio</p>
            <div className="flex flex-col gap-0.5">
              {[
                { label: "Feed", path: "/" },
                { label: "Portafolio", path: "/portafolio" },
                { label: "Perfil", path: "/perfil" },
              ].map((item) => (
                <button key={item.label} onClick={() => router.push(item.path)}
                  className="text-left px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition font-medium">
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-3">Comunidad</p>
            <div className="flex flex-col gap-0.5">
              {[
                { label: "Preguntas", path: "/comunidad" },
                { label: "Eventos", path: "/eventos" },
              ].map((item) => (
                <button key={item.label} onClick={() => router.push(item.path)}
                  className="text-left px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition font-medium">
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 order-1 md:order-2">
          <Stories />
          {proximoEvento && (
            <div
              onClick={() => router.push("/eventos")}
              className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 mb-4 shadow-md cursor-pointer hover:shadow-lg transition flex items-center gap-3"
            >
              <Calendar size={22} className="text-white flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-blue-100 font-semibold uppercase tracking-wide">Próximo evento</p>
                <p className="text-sm font-bold text-white">{proximoEvento.titulo}</p>
                <p className="text-xs text-blue-100 mt-0.5">
                  {new Date(proximoEvento.fechaEvento + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-white font-semibold">
                Ver <ArrowRight size={14} />
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 shadow-md">
            <div className="flex gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0 shadow overflow-hidden">
                {perfilesFotos[user?.email || ""] ? (
                  <img src={perfilesFotos[user?.email || ""]} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName?.charAt(0).toUpperCase()
                )}
              </div>
              <div
                className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
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
                  className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${tipoSeleccionado === tipo && showComposer ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600"}`}
                >
                  {tipo}
                </button>
              ))}
            </div>
            {showComposer && (
              <div className="mt-4">
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:border-blue-400"
                  rows={4}
                  placeholder={`Escribe tu ${tipoSeleccionado.toLowerCase()} aquí...`}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-blue-400 transition">
                    <Paperclip size={14} /> Adjuntar
                    <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)} />
                  </label>
                  {archivoSeleccionado && <span className="text-xs text-blue-600 font-medium">✓ {archivoSeleccionado.name}</span>}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPrivacidadMenu((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-blue-400 transition"
                    >
                      {(() => {
                        const Icono = PRIVACIDAD_INFO[privacidad].icono;
                        return <Icono size={14} />;
                      })()}
                      {PRIVACIDAD_INFO[privacidad].label}
                      <ChevronDown size={12} />
                    </button>
                    {showPrivacidadMenu && (
                      <div className="absolute z-10 top-full mt-1 left-0 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5">
                        {OPCIONES_PRIVACIDAD.map((valor) => {
                          const op = PRIVACIDAD_INFO[valor];
                          const Icono = op.icono;
                          const activo = privacidad === valor;
                          return (
                            <button
                              key={valor}
                              type="button"
                              onClick={() => { setPrivacidad(valor); setShowPrivacidadMenu(false); }}
                              className={`w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg transition ${activo ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                            >
                              <Icono size={15} className={`mt-0.5 flex-shrink-0 ${activo ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                              <span>
                                <span className={`block text-xs font-semibold ${activo ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>{op.label}</span>
                                <span className="block text-[11px] text-slate-400">{op.desc}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {["Diario", "Planeación", "Narrativa"].includes(tipoSeleccionado) && contenido.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowModalMejorarIA(true)}
                      className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 px-3 py-2 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-950/50 transition font-medium"
                    >
                      <Sparkles size={14} /> Mejorar con IA
                    </button>
                  )}

                  <div className="flex justify-end gap-2 ml-auto">
                    <button
                      onClick={() => {
                        setShowComposer(false);
                        setContenido("");
                        setArchivoSeleccionado(null);
                        setPrivacidad("publico");
                        setVisiblePara([]);
                        setShowPrivacidadMenu(false);
                      }}
                      className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 px-4 py-2"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={publicar}
                      disabled={publicando || !contenido.trim()}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
                    >
                      {publicando ? "Publicando..." : "Publicar"}
                    </button>
                  </div>
                </div>

                <ModalMejorarIA
                  visible={showModalMejorarIA}
                  original={contenido}
                  tipo={tipoSeleccionado}
                  onUsar={(texto) => { setContenido(texto); setShowModalMejorarIA(false); }}
                  onCancelar={() => setShowModalMejorarIA(false)}
                />

                {privacidad === "especifico" && (
                  <div className="mt-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto">
                    {amigos.length === 0 && (
                      <p className="text-xs text-slate-400">Agrega amigos para poder compartir con personas específicas.</p>
                    )}
                    {amigos.map((emailAmigo) => (
                      <label key={emailAmigo} className="flex items-center gap-2 py-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visiblePara.includes(emailAmigo)}
                          onChange={(e) => {
                            setVisiblePara((prev) =>
                              e.target.checked ? [...prev, emailAmigo] : prev.filter((em) => em !== emailAmigo)
                            );
                          }}
                        />
                        {nombreAmigo(emailAmigo)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {postsFiltrados.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
              {busqueda ? `No se encontraron resultados para "${busqueda}"` : "Aún no hay publicaciones. ¡Sé el primero!"}
            </div>
          )}
          {postsFiltrados.map((post, index) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow overflow-hidden">
                  {perfilesFotos[post.email] ? (
                    <img src={perfilesFotos[post.email]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.autor?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                    {post.autor}
                    {ADMINS_LOCAL.includes(post.email) && <InsigniaVerificada tipo="admin" />}
                    {!ADMINS_LOCAL.includes(post.email) && maestrosEmails.includes(post.email) && <InsigniaVerificada tipo="maestro" />}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>{post.tipo}</span>
                  {post.fecha && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      {post.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })} · {post.fecha?.toDate?.()?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      <IconoPrivacidad valor={post.privacidad} />
                    </p>
                  )}
                </div>
              </div>
              {post.tipo === "Compartido" ? (
                <div className="mb-3">
                  {post.contenido && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{post.contenido}</p>
                  )}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                      <Repeat2 size={12} /> Publicación original de {post.repostOriginal?.autor || "un usuario"}
                    </p>
                    {post.repostOriginal?.tipo && (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mb-1.5 ${coloresTipo[post.repostOriginal.tipo] || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
                        {post.repostOriginal.tipo}
                      </span>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{post.repostOriginal?.contenido}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{post.contenido}</p>
                  {post.archivoUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.archivoNombre || "") ? (
                    <img
                      src={post.archivoUrl}
                      alt={post.archivoNombre}
                      className="w-full rounded-xl mb-3 border border-slate-200 dark:border-slate-800 max-h-96 object-cover"
                    />
                  ) : post.archivoUrl && (
                    <a href={post.archivoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition mb-3">
                      <Paperclip size={14} /> {post.archivoNombre || "Ver archivo adjunto"}
                    </a>
                  )}
                </>
              )}
              <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 items-center">
                <button
                  onClick={() => darLike(post.id, post.email)}
                  className={`flex items-center gap-1 text-xs font-semibold transition-all duration-200 ${likes[post.id] ? "text-red-500 scale-110" : "text-slate-400 hover:text-red-500"}`}
                >
                  <Heart
                    size={14}
                    fill={likes[post.id] ? "currentColor" : "none"}
                    className={likeJustPopped[post.id] ? "animate-heart-pop" : ""}
                  />{" "}
                  {post.likesCount || 0}
                </button>
                {post.email === user?.email && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                    <ThumbsDown size={14} /> {post.dislikesCount || 0}
                  </span>
                )}
                {post.email !== user?.email && (
                  <button
                    onClick={() => darDislike(post.id)}
                    className={`flex items-center gap-1 text-xs font-semibold transition-all duration-200 ${dislikes[post.id] ? "text-slate-700 dark:text-slate-300 scale-110" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"}`}
                  >
                    <ThumbsDown size={14} fill={dislikes[post.id] ? "currentColor" : "none"} />
                  </button>
                )}
                <button onClick={() => toggleComentarios(post.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 font-semibold transition">
                  <MessageCircle size={14} /> {showComentarios[post.id] ? "Ocultar" : "Comentar"}
                </button>
                {(post.privacidad || "publico") === "publico" && (
                  <button onClick={() => compartirPost(post)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-500 font-semibold transition">
                    <Repeat2 size={14} /> Compartir
                  </button>
                )}
                {post.email !== user?.email && (
                  <button
                    onClick={() => reportarPost(post.id, post.autor, post.email)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 font-semibold transition ml-auto"
                  >
                    <Flag size={14} /> Reportar
                  </button>
                )}
              </div>
              {showComentarios[post.id] && (
                <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {comentarios[post.id]?.length === 0 && <p className="text-xs text-slate-400 mb-3">Aún no hay comentarios.</p>}
                  {comentarios[post.id]?.map((c: any) => (
                    <div key={c.id} className="flex gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                        {perfilesFotos[c.email] ? (
                          <img src={perfilesFotos[c.email]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          c.autor?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                        <p className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                          {c.autor}
                          {ADMINS_LOCAL.includes(c.email) && <InsigniaVerificada tipo="admin" size={11} />}
                          {!ADMINS_LOCAL.includes(c.email) && maestrosEmails.includes(c.email) && <InsigniaVerificada tipo="maestro" size={11} />}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{c.texto}</p>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => darLikeComentario(post.id, c.id)}
                            className={`flex items-center gap-1 text-xs font-semibold transition ${likesComentarios[c.id] ? "text-red-500" : "text-slate-400 hover:text-red-500"}`}
                          >
                            <Heart
                              size={12}
                              fill={likesComentarios[c.id] ? "currentColor" : "none"}
                              className={likeComentarioJustPopped[c.id] ? "animate-heart-pop" : ""}
                            />{" "}
                            {c.likesCount || 0}
                          </button>
                          <button
                            onClick={() => darDislikeComentario(post.id, c.id)}
                            className={`flex items-center gap-1 text-xs font-semibold transition ${dislikesComentarios[c.id] ? "text-slate-700 dark:text-slate-300" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"}`}
                          >
                            <ThumbsDown size={12} fill={dislikesComentarios[c.id] ? "currentColor" : "none"} /> {c.dislikesCount || 0}
                          </button>
                        </div>
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
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                    />
                    <button onClick={() => publicarComentario(post.id, post.email)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95">
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="col-span-1 order-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mi avance</p>
            {[
              { label: "Diarios", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Diario").length / 10) * 100, 100), color: "bg-blue-500" },
              { label: "Planeaciones", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Planeación").length / 5) * 100, 100), color: "bg-indigo-500" },
              { label: "Narrativa", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Narrativa").length / 1) * 100, 100), color: "bg-amber-500" },
              { label: "Extras", value: Math.min((posts.filter(p => p.email === user?.email && p.tipo === "Extra").length / 3) * 100, 100), color: "bg-cyan-500" },
            ].map((item) => (
              <div key={item.label} className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.label}</span>
                  <span className="text-slate-400">{item.value.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full shadow-sm`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mt-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mis grupos</p>
            {misGrupos.length === 0 && <p className="text-xs text-slate-400">No perteneces a ningún grupo.</p>}
            {misGrupos.map((grupo: any) => (
              <div key={grupo.id} className="flex items-center gap-2 mb-2 p-2 rounded-xl hover:bg-blue-50 cursor-pointer transition" onClick={() => router.push("/grupos")}>
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Layers size={14} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{grupo.nombre}</p>
              </div>
            ))}
            <button onClick={() => router.push("/grupos")} className="text-xs text-blue-500 hover:text-blue-700 font-semibold mt-2">
              Ver todos →
            </button>
          </div>
          <Tendencias />
          <AmigosSugeridos compacto />
          <div className="bg-slate-900 rounded-2xl p-4 mt-4 shadow-md text-center">
            <img src="/logo.png" alt="ENSFA" className="w-12 h-12 rounded-full mx-auto mb-2 opacity-90" />
            <p className="text-xs font-bold text-white">ENSFA</p>
            <p className="text-xs text-slate-400 mt-0.5">Aguascalientes</p>
          </div>
        </div>

      </div>

      <ModalInput
        visible={!!modalReportar}
        titulo="Reportar publicación"
        placeholder="¿Por qué quieres reportar esta publicación? (motivo breve)"
        textoConfirmar="Enviar reporte"
        onConfirmar={confirmarReportar}
        onCancelar={() => setModalReportar(null)}
      />

      <ModalInput
        visible={!!modalCompartir}
        titulo="Compartir publicación"
        placeholder="Agrega un comentario (opcional)..."
        textoConfirmar="Compartir"
        requerido={false}
        onConfirmar={confirmarCompartir}
        onCancelar={() => setModalCompartir(null)}
      />

    </div>
  );
}