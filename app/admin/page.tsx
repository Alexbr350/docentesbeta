"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { ShieldAlert, Users2, ClipboardList, Star, Flag, Calendar, GraduationCap, MessageCircle, Trash2, Send, CheckCircle2, ImageIcon, FileIcon } from "lucide-react";

const ADMINS: string[] = [
  "eira.vargas@ensfa.edu.mx",
  "alejandro_br.his23u@ensfa.edu.mx",
];
const MAESTROS: string[] = [];

function AddMaestroForm() {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [agregando, setAgregando] = useState(false);

  const agregar = async () => {
    if (!email.trim()) return;
    setAgregando(true);
    await addDoc(collection(db, "maestros"), {
      email,
      nombre,
      fecha: serverTimestamp(),
    });
    setEmail("");
    setNombre("");
    setAgregando(false);
    alert("¡Maestro agregado!");
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <input
        type="text"
        placeholder="Nombre del maestro..."
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 flex-1"
      />
      <input
        type="email"
        placeholder="Correo @ensfa.edu.mx..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 flex-1"
      />
      <button
        onClick={agregar}
        disabled={agregando || !email.trim()}
        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl disabled:opacity-50 font-semibold"
      >
        {agregando ? "Agregando..." : "Agregar maestro"}
      </button>
    </div>
  );
}

function ReportesList() {
  const [reportes, setReportes] = useState<any[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, "reportes"), orderBy("fecha", "desc"))).then((snap) => {
      setReportes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const marcarRevisado = async (id: string) => {
    await updateDoc(doc(db, "reportes", id), { estado: "revisado" });
    setReportes(reportes.map((r) => r.id === id ? { ...r, estado: "revisado" } : r));
  };

  return (
    <div>
      {reportes.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
          No hay reportes todavía.
        </div>
      )}
      {reportes.map((r) => (
        <div key={r.id} className={`bg-white rounded-2xl p-5 mb-3 shadow-md border-l-4 ${r.estado === "revisado" ? "border-emerald-400" : "border-orange-400"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 text-xs font-bold text-orange-600"><Flag size={13} /> Reporte de publicación</span>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${r.estado === "revisado" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-600"}`}>
              {r.estado === "revisado" ? <><CheckCircle2 size={12} /> Revisado</> : "Pendiente"}
            </span>
          </div>
          <p className="text-sm text-slate-700 mb-1"><span className="font-bold">Reportado:</span> {r.autorReportado} ({r.emailReportado})</p>
          <p className="text-sm text-slate-700 mb-1"><span className="font-bold">Reportado por:</span> {r.reportadoPor}</p>
          <p className="text-sm text-slate-700 mb-3"><span className="font-bold">Motivo:</span> {r.motivo}</p>
          {r.estado !== "revisado" && (
            <button
              onClick={() => marcarRevisado(r.id)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-semibold"
            >
              Marcar como revisado
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function EventosList() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [imagenEvento, setImagenEvento] = useState<File | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    const snap = await getDocs(query(collection(db, "eventos"), orderBy("fechaEvento", "asc")));
    setEventos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const crearEvento = async () => {
    if (!titulo.trim() || !fechaEvento) return;
    setCreando(true);
    let imagenUrl = null;
    let imagenNombre = null;
    if (imagenEvento) {
      const formData = new FormData();
      formData.append("file", imagenEvento);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      imagenUrl = data.secure_url;
      imagenNombre = imagenEvento.name;
    }
    await addDoc(collection(db, "eventos"), {
      titulo,
      descripcion,
      fechaEvento,
      fecha: serverTimestamp(),
      ...(imagenUrl && { imagenUrl, imagenNombre }),
    });
    setTitulo("");
    setDescripcion("");
    setFechaEvento("");
    setImagenEvento(null);
    setCreando(false);
    cargarEventos();
  };

  const eliminarEvento = async (id: string) => {
    if (!confirm("¿Eliminar este evento?")) return;
    await deleteDoc(doc(db, "eventos", id));
    setEventos(eventos.filter((e) => e.id !== id));
  };

  return (
    <div>
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-md">
        <h3 className="text-sm font-extrabold text-gray-800 mb-4 flex items-center gap-1.5"><Calendar size={16} className="text-pink-500" /> Nuevo evento</h3>
        <input
          type="text"
          placeholder="Título del evento..."
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 mb-3 focus:outline-none focus:border-blue-400"
        />
        <textarea
          placeholder="Descripción del evento..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none mb-3 focus:outline-none focus:border-blue-400"
        />
        <input
          type="date"
          value={fechaEvento}
          onChange={(e) => setFechaEvento(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 mb-3 focus:outline-none focus:border-blue-400"
        />
        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:border-blue-400 transition mb-3 w-fit">
          <ImageIcon size={14} /> Adjuntar imagen o PDF del evento
          <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" className="hidden" onChange={(e) => setImagenEvento(e.target.files?.[0] || null)} />
        </label>
        {imagenEvento && <p className="text-xs text-blue-600 font-medium mb-3">✓ {imagenEvento.name}</p>}
        <button
          onClick={crearEvento}
          disabled={creando || !titulo.trim() || !fechaEvento}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow"
        >
          {creando ? "Creando..." : "Crear evento"}
        </button>
      </div>

      {eventos.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
          No hay eventos todavía.
        </div>
      )}
      {eventos.map((e) => (
        <div key={e.id} className="bg-white rounded-2xl p-4 mb-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            {e.imagenUrl && /\.pdf$/i.test(e.imagenNombre || "") ? (
              <a href={e.imagenUrl} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0"><FileIcon size={22} className="text-red-500" /></a>
            ) : e.imagenUrl && (
              <img src={e.imagenUrl} alt={e.titulo} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-800">{e.titulo}</p>
              <p className="text-xs text-slate-500 mt-0.5">{e.descripcion}</p>
              <p className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-1">
                <Calendar size={12} /> {new Date(e.fechaEvento + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <button
            onClick={() => eliminarEvento(e.id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold"
          >
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}

function MaestrosList() {
  const [maestros, setMaestros] = useState<any[]>([]);

  useEffect(() => {
    getDocs(collection(db, "maestros")).then((snap) => {
      setMaestros(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  return (
    <div>
      {maestros.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
          No hay maestros registrados todavía.
        </div>
      )}
      {maestros.map((m) => (
        <div key={m.id} className="bg-white rounded-2xl p-4 mb-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center font-extrabold shadow">
              {m.nombre?.charAt(0).toUpperCase() || "M"}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{m.nombre || "Sin nombre"}</p>
              <p className="text-xs text-slate-400">{m.email}</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold"><GraduationCap size={13} /> Maestro</span>
        </div>
      ))}
    </div>
  );
}

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

  const eliminarPost = async (postId: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación?")) return;
    await deleteDoc(doc(db, "posts", postId));
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const calificar = async (postId: string, postAutorEmail: string, calificacion: number) => {
    await updateDoc(doc(db, "posts", postId), { calificacion });
    await addDoc(collection(db, "notificaciones"), {
      para: postAutorEmail,
      de: user.displayName || user.email,
      mensaje: `calificó tu publicación con ${calificacion}/10`,
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
        <ShieldAlert size={48} className="text-red-400 mx-auto mb-4" />
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
      <Navbar paginaActual="Admin" />

      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { num: usuarios.length, label: "Practicantes", icon: Users2 },
            { num: posts.length, label: "Publicaciones totales", icon: ClipboardList },
            { num: posts.filter(p => p.calificacion).length, label: "Calificadas", icon: Star },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 rounded-2xl p-5 text-center shadow-xl">
              <s.icon size={26} className="mx-auto mb-2 text-blue-400" />
              <div className="text-3xl font-extrabold text-white">{s.num}</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-5">
          {["publicaciones", "practicantes", "maestros", "reportes", "eventos"].map((v) => (
            <button
              key={v}
              onClick={() => setVistaActual(v)}
              className={`flex items-center gap-1.5 text-sm px-5 py-2 rounded-xl border transition font-semibold ${vistaActual === v ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "border-slate-200 text-slate-500 bg-white hover:border-slate-400"}`}
            >
              {v === "publicaciones" && <ClipboardList size={14} />}
              {v === "practicantes" && <Users2 size={14} />}
              {v === "maestros" && <GraduationCap size={14} />}
              {v === "reportes" && <Flag size={14} />}
              {v === "eventos" && <Calendar size={14} />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

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

                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Star size={13} className="text-amber-500" /> Calificación</p>
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

                <div className="border-t border-slate-100 pt-3 flex gap-3">
                  <button
                    onClick={() => toggleComentarios(post.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 font-semibold transition"
                  >
                    <MessageCircle size={14} /> {showComentarios[post.id] ? "Ocultar" : "Comentar como evaluador"}
                  </button>
                  <button
                    onClick={() => eliminarPost(post.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition"
                  >
                    <Trash2 size={14} /> Eliminar publicación
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
                        className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl font-semibold"
                      >
                        <Send size={13} /> Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {vistaActual === "reportes" && <ReportesList />}

        {vistaActual === "eventos" && <EventosList />}

        {vistaActual === "maestros" && (
          <div>
            <div className="bg-white rounded-2xl p-5 mb-4 shadow-md">
              <h3 className="text-sm font-extrabold text-gray-800 mb-4 flex items-center gap-1.5"><GraduationCap size={16} className="text-green-600" /> Gestionar Maestros</h3>
              <p className="text-xs text-slate-500 mb-4">Agrega correos de maestros para que puedan calificar a sus grupos.</p>
              <AddMaestroForm />
            </div>
            <MaestrosList />
          </div>
        )}
      </div>
    </div>
  );
}