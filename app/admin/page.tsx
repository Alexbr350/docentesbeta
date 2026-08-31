"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { ShieldAlert, Users2, ClipboardList, Star, Flag, Calendar, GraduationCap, MessageCircle, Trash2, Send, CheckCircle2, ImageIcon, FileIcon, BarChart3, Presentation, FileDown, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import jsPDF from "jspdf";
import ModalConfirmar from "../components/ModalConfirmar";
import ModalSugerenciaIA from "../components/ModalSugerenciaIA";
import { useToast } from "../components/Toast";
import { ADMINS } from "../lib/admins";

const MAESTROS: string[] = [];

// Convierte una imagen servida por la app (ej. /logo.png) a base64 para poder
// insertarla en el PDF con pdf.addImage().
function cargarImagenComoBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

type ColumnaTabla = { titulo: string; ancho: number };

// Dibuja una tabla simple (encabezado + filas con banda alterna) en el PDF,
// redibujando el encabezado cada vez que el contenido salta de página.
// Devuelve el nuevo cursor Y para seguir escribiendo debajo de la tabla.
function dibujarTabla(pdf: jsPDF, columnas: ColumnaTabla[], filas: string[][], yInicio: number, margenIzq = 20): number {
  let y = yInicio;
  const alturaFila = 7;
  const anchoTotal = columnas.reduce((s, c) => s + c.ancho, 0);

  const dibujarEncabezado = () => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margenIzq, y - 5, anchoTotal, alturaFila, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    let x = margenIzq + 2;
    columnas.forEach((c) => {
      pdf.text(c.titulo, x, y);
      x += c.ancho;
    });
    pdf.setTextColor(30, 30, 30);
    y += alturaFila;
  };

  dibujarEncabezado();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);

  filas.forEach((fila, i) => {
    if (y > 275) {
      pdf.addPage();
      y = 20;
      dibujarEncabezado();
    }
    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margenIzq, y - 5, anchoTotal, alturaFila, "F");
    }
    let x = margenIzq + 2;
    fila.forEach((valor, j) => {
      const anchoCol = columnas[j].ancho;
      const texto = pdf.splitTextToSize(valor || "", anchoCol - 3)[0] || "";
      pdf.text(texto, x, y);
      x += anchoCol;
    });
    y += alturaFila;
  });

  return y + 4;
}

function AddMaestroForm() {
  const { mostrarToast } = useToast();
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
    mostrarToast("¡Maestro agregado!");
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <input
        type="text"
        placeholder="Nombre del maestro..."
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400 flex-1"
      />
      <input
        type="email"
        placeholder="Correo @ensfa.edu.mx..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400 flex-1"
      />
      <button
        onClick={agregar}
        disabled={agregando || !email.trim()}
        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl disabled:opacity-50 font-semibold transition active:scale-95"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
          No hay reportes todavía.
        </div>
      )}
      {reportes.map((r) => (
        <div key={r.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md border-l-4 ${r.estado === "revisado" ? "border-emerald-400" : "border-orange-400"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 text-xs font-bold text-orange-600"><Flag size={13} /> Reporte de publicación</span>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${r.estado === "revisado" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"}`}>
              {r.estado === "revisado" ? <><CheckCircle2 size={12} /> Revisado</> : "Pendiente"}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-1"><span className="font-bold">Reportado:</span> {r.autorReportado} ({r.emailReportado})</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-1"><span className="font-bold">Reportado por:</span> {r.reportadoPor}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-3"><span className="font-bold">Motivo:</span> {r.motivo}</p>
          {r.estado !== "revisado" && (
            <button
              onClick={() => marcarRevisado(r.id)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-semibold transition active:scale-95"
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
  const [eventoAEliminar, setEventoAEliminar] = useState<string | null>(null);

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
    setEventoAEliminar(null);
    await deleteDoc(doc(db, "eventos", id));
    setEventos(eventos.filter((e) => e.id !== id));
  };

  return (
    <div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-4 shadow-md">
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5"><Calendar size={16} className="text-pink-500" /> Nuevo evento</h3>
        <input
          type="text"
          placeholder="Título del evento..."
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mb-3 focus:outline-none focus:border-blue-400"
        />
        <textarea
          placeholder="Descripción del evento..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 resize-none mb-3 focus:outline-none focus:border-blue-400"
        />
        <input
          type="date"
          value={fechaEvento}
          onChange={(e) => setFechaEvento(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mb-3 focus:outline-none focus:border-blue-400"
        />
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-blue-400 transition mb-3 w-fit">
          <ImageIcon size={14} /> Adjuntar imagen o PDF del evento
          <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" className="hidden" onChange={(e) => setImagenEvento(e.target.files?.[0] || null)} />
        </label>
        {imagenEvento && <p className="text-xs text-blue-600 font-medium mb-3">✓ {imagenEvento.name}</p>}
        <button
          onClick={crearEvento}
          disabled={creando || !titulo.trim() || !fechaEvento}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
        >
          {creando ? "Creando..." : "Crear evento"}
        </button>
      </div>

      {eventos.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
          No hay eventos todavía.
        </div>
      )}
      {eventos.map((e) => (
        <div key={e.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            {e.imagenUrl && /\.pdf$/i.test(e.imagenNombre || "") ? (
              <a href={e.imagenUrl} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center flex-shrink-0"><FileIcon size={22} className="text-red-500" /></a>
            ) : e.imagenUrl && (
              <img src={e.imagenUrl} alt={e.titulo} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{e.titulo}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{e.descripcion}</p>
              <p className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-1">
                <Calendar size={12} /> {new Date(e.fechaEvento + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEventoAEliminar(e.id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold"
          >
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      ))}

      <ModalConfirmar
        visible={!!eventoAEliminar}
        mensaje="¿Eliminar este evento?"
        destructivo
        onConfirmar={() => eventoAEliminar && eliminarEvento(eventoAEliminar)}
        onCancelar={() => setEventoAEliminar(null)}
      />
    </div>
  );
}

function Dashboard({ posts, usuarios }: { posts: any[]; usuarios: any[] }) {
  const coloresGrafica = ["#3b82f6", "#6366f1", "#f59e0b", "#06b6d4", "#ef4444"];

  const datosPorTipo = ["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"].map((tipo) => ({
    tipo,
    cantidad: posts.filter((p) => p.tipo === tipo).length,
  }));

  const datosCalificaciones = [1,2,3,4,5,6,7,8,9,10].map((n) => ({
    nota: n.toString(),
    cantidad: posts.filter((p) => p.calificacion === n).length,
  }));

  const ultimos7dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (6 - i));
    const fechaStr = fecha.toLocaleDateString("es-MX", { weekday: "short" });
    const postsDelDia = posts.filter((p) => {
      const postFecha = p.fecha?.toDate?.();
      if (!postFecha) return false;
      return postFecha.toDateString() === fecha.toDateString();
    });
    return { dia: fechaStr, publicaciones: postsDelDia.length };
  });

  const publicacionesPorUsuario = usuarios
    .map((u) => ({ nombre: u.nombre?.split(" ")[0] || u.email, publicaciones: u.publicaciones }))
    .sort((a, b) => b.publicaciones - a.publicaciones)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4">Publicaciones por tipo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={datosPorTipo}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="tipo" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
              {datosPorTipo.map((_, i) => (
                <Cell key={i} fill={coloresGrafica[i % coloresGrafica.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4">Distribución de calificaciones</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={datosCalificaciones.filter(d => d.cantidad > 0)}
              dataKey="cantidad"
              nameKey="nota"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(entry: any) => entry.nota}
            >
              {datosCalificaciones.filter(d => d.cantidad > 0).map((_, i) => (
                <Cell key={i} fill={coloresGrafica[i % coloresGrafica.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4">Actividad últimos 7 días</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={ultimos7dias}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="publicaciones" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4">Top 5 practicantes más activos</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={publicacionesPorUsuario} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
            <YAxis dataKey="nombre" type="category" tick={{ fontSize: 10 }} width={70} />
            <Tooltip />
            <Bar dataKey="publicaciones" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
          No hay maestros registrados todavía.
        </div>
      )}
      {maestros.map((m) => (
        <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center font-extrabold shadow">
              {m.nombre?.charAt(0).toUpperCase() || "M"}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{m.nombre || "Sin nombre"}</p>
              <p className="text-xs text-slate-400">{m.email}</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-3 py-1 rounded-full font-semibold"><GraduationCap size={13} /> Maestro</span>
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
  const [vistaActual, setVistaActual] = useState("dashboard");
  const [comentarios, setComentarios] = useState<any>({});
  const [showComentarios, setShowComentarios] = useState<any>({});
  const [nuevoComentario, setNuevoComentario] = useState<any>({});
  const [calificaciones, setCalificaciones] = useState<any>({});
  const [postAEliminar, setPostAEliminar] = useState<string | null>(null);
  const [postParaSugerenciaIA, setPostParaSugerenciaIA] = useState<any>(null);
  const [generandoReporte, setGenerandoReporte] = useState(false);

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
    setPostAEliminar(null);
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

  const exportarReporteInstitucional = async () => {
    setGenerandoReporte(true);
    try {
      const logoBase64 = await cargarImagenComoBase64("/logo.png").catch(() => null);
      const pdf = new jsPDF();
      const fechaGeneracion = new Date();
      const fechaLegible = fechaGeneracion.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

      // ---------- Portada ----------
      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", 85, 45, 40, 40);
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("Reporte Institucional", 105, 105, { align: "center" });
      pdf.setTextColor(37, 99, 235);
      pdf.setFontSize(16);
      pdf.text("ENSFA+", 105, 116, { align: "center" });
      pdf.setTextColor(0, 0, 0);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Escuela Normal Superior Federal de Aguascalientes", 105, 135, { align: "center" });
      pdf.text('"Profr. José Santos Valdés"', 105, 142, { align: "center" });

      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generado el ${fechaLegible}`, 105, 155, { align: "center" });
      pdf.setTextColor(0, 0, 0);

      // ---------- Resumen general ----------
      pdf.addPage();
      let y = 25;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Resumen general", 20, y);
      y += 10;

      const postsCalificados = posts.filter((p) => p.calificacion);
      const promedioGeneral = postsCalificados.length > 0
        ? postsCalificados.reduce((s, p) => s + p.calificacion, 0) / postsCalificados.length
        : 0;

      const resumen = [
        { label: "Total de practicantes", valor: String(usuarios.length) },
        { label: "Total de publicaciones", valor: String(posts.length) },
        { label: "Publicaciones calificadas", valor: String(postsCalificados.length) },
        { label: "Calificación promedio general", valor: postsCalificados.length > 0 ? `${promedioGeneral.toFixed(1)}/10` : "Sin calificaciones" },
      ];

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      resumen.forEach((r) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${r.label}:`, 20, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(r.valor, 95, y);
        y += 8;
      });
      y += 6;

      // ---------- Publicaciones por tipo ----------
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Publicaciones por tipo", 20, y);
      y += 10;

      const tiposReporte = ["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"];
      const filasTipo = tiposReporte.map((tipo) => [tipo, String(posts.filter((p) => p.tipo === tipo).length)]);

      y = dibujarTabla(pdf, [
        { titulo: "Tipo de publicación", ancho: 120 },
        { titulo: "Cantidad", ancho: 50 },
      ], filasTipo, y);
      y += 8;

      // ---------- Actividad reciente (últimos 7 días) ----------
      if (y > 245) { pdf.addPage(); y = 25; }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Actividad reciente (últimos 7 días)", 20, y);
      y += 10;

      const ultimos7diasReporte = Array.from({ length: 7 }, (_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - (6 - i));
        const postsDelDia = posts.filter((p) => {
          const pf = p.fecha?.toDate?.();
          return pf && pf.toDateString() === fecha.toDateString();
        });
        return {
          fecha: fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" }),
          cantidad: postsDelDia.length,
        };
      });
      const totalSemana = ultimos7diasReporte.reduce((s, d) => s + d.cantidad, 0);

      y = dibujarTabla(pdf, [
        { titulo: "Día", ancho: 120 },
        { titulo: "Publicaciones", ancho: 50 },
      ], ultimos7diasReporte.map((d) => [d.fecha, String(d.cantidad)]), y);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`Total de la semana: ${totalSemana} publicaciones`, 20, y);
      y += 12;

      // ---------- Tabla de practicantes ----------
      if (y > 240) { pdf.addPage(); y = 25; }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(`Practicantes (${usuarios.length})`, 20, y);
      y += 10;

      const filasPracticantes = usuarios
        .slice()
        .sort((a, b) => (b.publicaciones || 0) - (a.publicaciones || 0))
        .map((u) => {
          const postsCalificadosDeUsuario = posts.filter((p) => p.email === u.email && p.calificacion);
          const promedioIndividual = postsCalificadosDeUsuario.length > 0
            ? postsCalificadosDeUsuario.reduce((s, p) => s + p.calificacion, 0) / postsCalificadosDeUsuario.length
            : null;
          return [
            u.nombre || "Sin nombre",
            u.email,
            String(u.publicaciones || 0),
            promedioIndividual !== null ? `${promedioIndividual.toFixed(1)}/10` : "Sin calificar",
          ];
        });

      dibujarTabla(pdf, [
        { titulo: "Nombre", ancho: 45 },
        { titulo: "Correo", ancho: 65 },
        { titulo: "Publ.", ancho: 25 },
        { titulo: "Calificación", ancho: 35 },
      ], filasPracticantes, y);

      // ---------- Pie de página institucional en todas las páginas ----------
      const totalPaginas = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(140, 140, 140);
        pdf.text("Escuela Normal Superior Federal de Aguascalientes · Profr. José Santos Valdés", 20, 290);
        pdf.text(`Página ${i} de ${totalPaginas}`, 190, 290, { align: "right" });
      }

      const fechaArchivo = fechaGeneracion.toISOString().split("T")[0];
      pdf.save(`Reporte_Institucional_ENSFA_${fechaArchivo}.pdf`);
    } finally {
      setGenerandoReporte(false);
    }
  };

  const coloresTipo: any = {
    "Diario": "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
    "Planeación": "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    "Narrativa": "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    "Extra": "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
    "Pedir ayuda": "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Admin" />

      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 dark:text-slate-100">Panel de administración</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Gestiona la plataforma y revisa el progreso de los practicantes</p>
          </div>
          <button
            onClick={() => router.push("/presentacion")}
            className="flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg transition active:scale-95"
          >
            <Presentation size={16} className="text-blue-400" /> Modo Presentación
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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

        <div className="flex gap-2 mb-5 overflow-x-auto flex-nowrap pb-1">
          {["dashboard", "publicaciones", "practicantes", "maestros", "reportes", "eventos"].map((v) => (
            <button
              key={v}
              onClick={() => setVistaActual(v)}
              className={`flex items-center gap-1.5 text-sm px-5 py-2 rounded-xl border transition font-semibold flex-shrink-0 ${vistaActual === v ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-400"}`}
            >
              {v === "dashboard" && <BarChart3 size={14} />}
              {v === "publicaciones" && <ClipboardList size={14} />}
              {v === "practicantes" && <Users2 size={14} />}
              {v === "maestros" && <GraduationCap size={14} />}
              {v === "reportes" && <Flag size={14} />}
              {v === "eventos" && <Calendar size={14} />}
              {v === "dashboard" ? "Estadísticas" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {vistaActual === "dashboard" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={exportarReporteInstitucional}
                disabled={generandoReporte}
                className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <FileDown size={16} /> {generandoReporte ? "Generando..." : "Exportar reporte institucional (PDF)"}
              </button>
            </div>
            <Dashboard posts={posts} usuarios={usuarios} />
          </div>
        )}

        {vistaActual === "practicantes" && (
          <div>
            {usuarios.map((u) => (
              <div key={u.email} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center font-extrabold shadow">
                      {u.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{u.nombre}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-gray-800 dark:text-slate-100">{u.publicaciones}</p>
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
              <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                      {post.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{post.autor}</p>
                      <p className="text-xs text-slate-400">{post.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                    {post.tipo}
                  </span>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{post.contenido}</p>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1"><Star size={13} className="text-amber-500" /> Calificación</p>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <button
                        key={n}
                        onClick={() => calificar(post.id, post.email, n)}
                        className={`w-full h-8 rounded-lg text-xs font-extrabold transition shadow-sm ${calificaciones[post.id] === n ? "bg-blue-600 text-white shadow-md scale-110" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 dark:border-slate-800"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {calificaciones[post.id] && (
                    <span className="mt-2 inline-block text-sm font-extrabold text-blue-600">{calificaciones[post.id]}/10 ✓</span>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex gap-3">
                  <button
                    onClick={() => toggleComentarios(post.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 font-semibold transition"
                  >
                    <MessageCircle size={14} /> {showComentarios[post.id] ? "Ocultar" : "Comentar como evaluador"}
                  </button>
                  <button
                    onClick={() => setPostAEliminar(post.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition"
                  >
                    <Trash2 size={14} /> Eliminar publicación
                  </button>
                </div>

                {showComentarios[post.id] && (
                  <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {comentarios[post.id]?.map((c: any) => (
                      <div key={c.id} className="flex gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.autor?.charAt(0).toUpperCase()}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                          <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{c.autor}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{c.texto}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPostParaSugerenciaIA(post)}
                      className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 px-3 py-2 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-950/50 transition font-medium mb-2"
                    >
                      <Sparkles size={14} /> Sugerir retroalimentación con IA
                    </button>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Escribe tu retroalimentación..."
                        value={nuevoComentario[post.id] || ""}
                        onChange={(e) => setNuevoComentario((prev: any) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && publicarComentario(post.id, post.email)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                      />
                      <button
                        onClick={() => publicarComentario(post.id, post.email)}
                        className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95"
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

        <ModalSugerenciaIA
          visible={!!postParaSugerenciaIA}
          contenidoPost={postParaSugerenciaIA?.contenido || ""}
          tipo={postParaSugerenciaIA?.tipo || "práctica docente"}
          colorTema="violet"
          onUsar={(texto) => {
            if (postParaSugerenciaIA) {
              setNuevoComentario((prev: any) => ({ ...prev, [postParaSugerenciaIA.id]: texto }));
            }
            setPostParaSugerenciaIA(null);
          }}
          onCancelar={() => setPostParaSugerenciaIA(null)}
        />

        {vistaActual === "reportes" && <ReportesList />}

        {vistaActual === "eventos" && <EventosList />}

        {vistaActual === "maestros" && (
          <div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-4 shadow-md">
              <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5"><GraduationCap size={16} className="text-green-600" /> Gestionar Maestros</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Agrega correos de maestros para que puedan calificar a sus grupos.</p>
              <AddMaestroForm />
            </div>
            <MaestrosList />
          </div>
        )}
      </div>

      <ModalConfirmar
        visible={!!postAEliminar}
        mensaje="¿Seguro que quieres eliminar esta publicación?"
        destructivo
        onConfirmar={() => postAEliminar && eliminarPost(postAEliminar)}
        onCancelar={() => setPostAEliminar(null)}
      />
    </div>
  );
}