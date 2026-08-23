"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import Navbar from "../components/Navbar";
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";
import jsPDF from "jspdf";
import { BookOpen, ClipboardList, PenLine, Paperclip, HelpCircle, FileDown, Trash2 } from "lucide-react";
import ModalConfirmar from "../components/ModalConfirmar";

export default function Portafolio() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postAEliminar, setPostAEliminar] = useState<string | null>(null);
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

  const exportarPDF = () => {
    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Portafolio Digital - ENSFA+", 20, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${user?.displayName || "Practicante"} — ${user?.email}`, 20, y);
    y += 6;
    pdf.text(`Total de publicaciones: ${posts.length}`, 20, y);
    y += 12;

    posts.forEach((post) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`${post.tipo}`, 20, y);
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const fecha = post.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) || "";
      pdf.text(fecha, 20, y);
      y += 6;

      const contenido = pdf.splitTextToSize(post.contenido || "", 170);
      pdf.text(contenido, 20, y);
      y += contenido.length * 5 + 3;

      if (post.calificacion) {
        pdf.setFont("helvetica", "bold");
        pdf.text(`Calificación: ${post.calificacion}/10`, 20, y);
        y += 6;
      }

      y += 6;
    });

    pdf.save(`Portafolio_${user?.displayName || "practicante"}.pdf`);
  };

  const eliminar = async (id: string) => {
    setPostAEliminar(null);
    await deleteDoc(doc(db, "posts", id));
    setPosts(posts.filter((p) => p.id !== id));
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const coloresTipo: any = {
    "Diario": "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
    "Planeación": "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    "Narrativa": "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    "Extra": "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
    "Pedir ayuda": "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  };

  const iconosTipo: any = {
    "Diario": BookOpen,
    "Planeación": ClipboardList,
    "Narrativa": PenLine,
    "Extra": Paperclip,
    "Pedir ayuda": HelpCircle,
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">

      <Navbar paginaActual="Portafolio" />

      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex flex-wrap items-center gap-5 shadow-xl">
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
          <button
            onClick={exportarPDF}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow transition active:scale-95"
          >
            <FileDown size={14} /> Exportar PDF
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-6">
          {["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"].map((tipo) => {
            const Icono = iconosTipo[tipo];
            return (
              <div key={tipo} className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition">
                <Icono size={24} className="mx-auto mb-1 text-blue-600" />
                <div className="text-2xl font-extrabold text-gray-800 dark:text-slate-100">
                  {posts.filter((p) => p.tipo === tipo).length}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-medium">{tipo}</div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          {tipos.map((tipo) => {
            const Icono = tipo !== "Todos" ? iconosTipo[tipo] : null;
            return (
              <button
                key={tipo}
                onClick={() => setFiltro(tipo)}
                className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border transition font-semibold ${filtro === tipo ? "bg-slate-900 text-white border-slate-900 shadow-md" : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-400"}`}
              >
                {Icono && <Icono size={13} />} {tipo} {tipo !== "Todos" && `(${posts.filter((p) => p.tipo === tipo).length})`}
              </button>
            );
          })}
        </div>

        {postsFiltrados.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
            No tienes publicaciones de tipo "{filtro}" todavía.
          </div>
        )}
        {postsFiltrados.map((post) => {
          const Icono = iconosTipo[post.tipo];
          return (
            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {Icono && <Icono size={16} className="text-blue-600" />}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                    {post.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">
                    {post.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => setPostAEliminar(post.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium hover:bg-red-50 px-2 py-1 rounded-lg transition"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{post.contenido}</p>
              {post.archivoUrl && (
                <a href={post.archivoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition mt-3">
                  <Paperclip size={14} /> {post.archivoNombre || "Ver archivo adjunto"}
                </a>
              )}
              {post.calificacion && (
                <div className="flex items-center gap-2 mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-blue-600">⭐ Calificación del evaluador:</span>
                  <span className="text-lg font-extrabold text-blue-700">{post.calificacion}/10</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ModalConfirmar
        visible={!!postAEliminar}
        mensaje="¿Seguro que quieres eliminar esta publicación?"
        destructivo
        onConfirmar={() => postAEliminar && eliminar(postAEliminar)}
        onCancelar={() => setPostAEliminar(null)}
      />
    </div>
  );
}