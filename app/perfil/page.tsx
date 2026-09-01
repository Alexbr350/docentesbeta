"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import Navbar from "../components/Navbar";
import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import { BookOpen, ClipboardList, PenLine, Paperclip, HelpCircle, BarChart3, Newspaper, Edit, GraduationCap, Hash, Heart, Repeat2, Flame, Sparkles, BadgeCheck, Clock, FileDown } from "lucide-react";
import Insignias from "../components/Insignias";
import MapaCalor from "../components/MapaCalor";
import ModalEditarPerfil from "../components/ModalEditarPerfil";
import ResumenWrapped from "../components/ResumenWrapped";
import { useToast } from "../components/Toast";
import { calcularRacha, proximoHitoRacha } from "../lib/racha";
import { metasCompletadas } from "../lib/certificado";

// Convierte una imagen servida por la app (ej. /logo.png) a base64 para poder
// insertarla en el PDF del certificado con pdf.addImage() (mismo patrón que
// ya usa app/admin/page.tsx para el reporte institucional).
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

export default function Perfil() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>({});
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [certificacion, setCertificacion] = useState<any>(null);
  const [generandoCertificado, setGenerandoCertificado] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/landing");
      } else {
        setUser(user);
        cargarPosts(user.email || "");
        cargarPerfil(user.email || "");
        cargarCertificacion(user.email || "");
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

  const cargarPerfil = async (email: string) => {
    const snap = await getDoc(doc(db, "perfiles", email));
    if (snap.exists()) setPerfil(snap.data());
  };

  const cargarCertificacion = async (email: string) => {
    const snap = await getDoc(doc(db, "certificaciones", email));
    if (snap.exists()) setCertificacion(snap.data());
  };

  const descargarCertificado = async () => {
    if (!certificacion) return;
    setGenerandoCertificado(true);
    try {
      const logoBase64 = await cargarImagenComoBase64("/logo.png").catch(() => null);
      const pdf = new jsPDF({ orientation: "landscape" });
      const nombreCompleto = user?.displayName || "Practicante";

      // ---------- Marco tipo diploma ----------
      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(1.2);
      pdf.rect(10, 10, 277, 190);
      pdf.setLineWidth(0.4);
      pdf.rect(14, 14, 269, 182);

      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", 133.5, 20, 30, 30);
      }

      // ---------- Título ----------
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("Certificado de Cumplimiento", 148.5, 64, { align: "center" });
      pdf.setTextColor(37, 99, 235);
      pdf.setFontSize(15);
      pdf.text("Práctica Docente", 148.5, 73, { align: "center" });
      pdf.setTextColor(15, 23, 42);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(90, 90, 90);
      pdf.text("Escuela Normal Superior Federal de Aguascalientes", 148.5, 82, { align: "center" });
      pdf.text('"Profr. José Santos Valdés"', 148.5, 88, { align: "center" });
      pdf.setTextColor(15, 23, 42);

      // ---------- Nombre del practicante ----------
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text("Se certifica que", 148.5, 101, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.text(nombreCompleto, 148.5, 115, { align: "center" });
      const anchoNombre = pdf.getTextWidth(nombreCompleto);
      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.6);
      pdf.line(148.5 - anchoNombre / 2, 119, 148.5 + anchoNombre / 2, 119);

      // ---------- Licenciatura (si existe en el perfil extendido) ----------
      let y = 129;
      if (perfil?.licenciatura) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(11);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`Licenciatura en ${perfil.licenciatura}`, 148.5, y, { align: "center" });
        pdf.setTextColor(15, 23, 42);
        y += 10;
      } else {
        y += 3;
      }

      // ---------- Texto institucional formal ----------
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const parrafo =
        "ha cumplido satisfactoriamente con los requisitos de la práctica docente, conforme a la evaluación y seguimiento realizado por su evaluador asignado, dentro del programa de formación de ENSFA+.";
      const lineas = pdf.splitTextToSize(parrafo, 190);
      lineas.forEach((linea: string, i: number) => {
        pdf.text(linea, 148.5, y + i * 6, { align: "center" });
      });

      // ---------- Folio, fecha y evaluador ----------
      const fechaTexto = certificacion.fechaCertificacion?.toDate?.()
        ? certificacion.fechaCertificacion.toDate().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
        : new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

      const yFirma = 172;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(90, 90, 90);
      pdf.text(`Folio: ${certificacion.folio}`, 30, yFirma - 2);
      pdf.text(`Fecha de certificación: ${fechaTexto}`, 30, yFirma + 5);

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text(certificacion.certificadoPor || "Evaluador", 246, yFirma - 2, { align: "center" });
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      pdf.line(225, yFirma, 267, yFirma);
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Evaluador · ENSFA+", 246, yFirma + 5, { align: "center" });

      // ---------- Pie institucional ----------
      pdf.setFontSize(7.5);
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        "Este documento certifica el cumplimiento de la práctica docente conforme al seguimiento registrado en ENSFA+.",
        148.5,
        195,
        { align: "center" }
      );

      pdf.save(`Certificado_ENSFA_${nombreCompleto.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setGenerandoCertificado(false);
    }
  };

  const handleGuardarPerfil = async (
    datos: { licenciatura: string; semestre: string; intereses: string },
    archivoFoto: File | null
  ) => {
    let fotoUrl = perfil.fotoUrl || "";
    if (archivoFoto) {
      const formData = new FormData();
      formData.append("file", archivoFoto);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      fotoUrl = data.secure_url;
    }
    const nuevoPerfil = {
      fotoUrl,
      licenciatura: datos.licenciatura,
      semestre: datos.semestre ? Number(datos.semestre) : null,
      intereses: datos.intereses,
    };
    await setDoc(doc(db, "perfiles", user.email), nuevoPerfil, { merge: true });
    setPerfil(nuevoPerfil);
    setShowEditarPerfil(false);
    mostrarToast("Perfil actualizado");
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const tipos = ["Diario", "Planeación", "Narrativa", "Extra", "Pedir ayuda"];
  const iconosTipo: any = {
    "Diario": BookOpen,
    "Planeación": ClipboardList,
    "Narrativa": PenLine,
    "Extra": Paperclip,
    "Pedir ayuda": HelpCircle,
    "Compartido": Repeat2,
  };
  const coloresTipo: any = {
    "Diario": "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
    "Planeación": "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    "Narrativa": "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    "Extra": "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
    "Pedir ayuda": "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
    "Compartido": "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400",
  };
  const miRacha = calcularRacha(posts, user?.email || "");
  const hitoRacha = proximoHitoRacha(miRacha);
  const completoMetas = metasCompletadas(posts, user?.email || "");
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">

      <Navbar paginaActual="Perfil" />

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-8 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-10"></div>
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 relative z-10 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-xl overflow-hidden flex-shrink-0">
              {perfil?.fotoUrl ? (
                <img src={perfil.fotoUrl} alt={user?.displayName || "Perfil"} className="w-full h-full object-cover" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 w-full">
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <h2 className="text-2xl font-extrabold text-white">{user?.displayName || "Practicante"}</h2>
                <button
                  onClick={() => setShowEditarPerfil(true)}
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg font-semibold transition active:scale-95"
                >
                  <Edit size={12} /> Editar perfil
                </button>
              </div>
              <p className="text-slate-400 mt-0.5">{user?.email}</p>
              <div className="flex gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">Practicante docente</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">@ensfa.edu.mx</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">{posts.length} publicaciones</span>
              </div>
              <button
                onClick={() => setShowWrapped(true)}
                className="flex items-center justify-center gap-1.5 mt-4 mx-auto sm:mx-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95"
              >
                <Sparkles size={15} /> Ver mi resumen del semestre
              </button>
              {(perfil?.licenciatura || perfil?.semestre || perfil?.intereses) && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5">
                  {perfil?.licenciatura && (
                    <p className="text-sm text-slate-300 flex items-center gap-2">
                      <GraduationCap size={14} className="text-blue-400 flex-shrink-0" /> {perfil.licenciatura}
                    </p>
                  )}
                  {perfil?.semestre && (
                    <p className="text-sm text-slate-300 flex items-center gap-2">
                      <Hash size={14} className="text-blue-400 flex-shrink-0" /> Semestre {perfil.semestre}
                    </p>
                  )}
                  {perfil?.intereses && (
                    <p className="text-sm text-slate-300 flex items-center gap-2">
                      <Heart size={14} className="text-blue-400 flex-shrink-0" /> {perfil.intereses}
                    </p>
                  )}
                </div>
              )}
            </div>
            <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full opacity-50 hidden md:block" />
          </div>
        </div>

        <ModalEditarPerfil
          visible={showEditarPerfil}
          perfilActual={perfil}
          nombreUsuario={user?.displayName}
          onGuardar={handleGuardarPerfil}
          onCancelar={() => setShowEditarPerfil(false)}
        />

        <div className={`rounded-2xl p-6 mb-6 shadow-xl relative overflow-hidden ${miRacha > 0 ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-10 pointer-events-none"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${miRacha > 0 ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
              <Flame size={30} className={miRacha > 0 ? "text-white fill-white" : "text-slate-400"} />
            </div>
            <div className="min-w-0">
              <p className={`text-3xl font-extrabold ${miRacha > 0 ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
                {miRacha} {miRacha === 1 ? "día" : "días"}
              </p>
              <p className={`text-sm font-semibold ${miRacha > 0 ? "text-white/80" : "text-slate-400"}`}>
                {miRacha > 0 ? "¡Racha activa! Sigue publicando todos los días." : "Publica hoy para comenzar tu racha."}
              </p>
              {hitoRacha && (
                <p className={`text-xs mt-1.5 ${miRacha > 0 ? "text-white/70" : "text-slate-400"}`}>
                  Faltan {hitoRacha - miRacha} {hitoRacha - miRacha === 1 ? "día" : "días"} para tu próximo hito de {hitoRacha} días.
                </p>
              )}
            </div>
          </div>
        </div>

        {completoMetas && (
          <div
            className={`rounded-2xl p-6 mb-6 shadow-xl relative overflow-hidden ${
              certificacion
                ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-10 pointer-events-none"></div>
            <div className="flex items-center gap-4 relative z-10 flex-wrap">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  certificacion ? "bg-white/20" : "bg-amber-100 dark:bg-amber-950/40"
                }`}
              >
                {certificacion ? (
                  <BadgeCheck size={30} className="text-white" />
                ) : (
                  <Clock size={28} className="text-amber-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {certificacion ? (
                  <>
                    <p className="text-lg font-extrabold text-white">Certificado de finalización</p>
                    <p className="text-sm text-white/80 mt-0.5">
                      Folio {certificacion.folio} · Certificado por {certificacion.certificadoPor}
                    </p>
                    {certificacion.comentario && (
                      <p className="text-sm text-white/70 mt-1.5 italic">"{certificacion.comentario}"</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100">¡Completaste tus metas!</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Espera la certificación de tu evaluador para desbloquear tu certificado de finalización.
                    </p>
                  </>
                )}
              </div>
              {certificacion && (
                <button
                  onClick={descargarCertificado}
                  disabled={generandoCertificado}
                  className="flex items-center gap-1.5 text-sm bg-white text-emerald-700 hover:bg-white/90 px-4 py-2.5 rounded-xl font-bold shadow transition active:scale-95 disabled:opacity-60 flex-shrink-0"
                >
                  <FileDown size={15} /> {generandoCertificado ? "Generando..." : "Descargar certificado"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          {tipos.map((tipo) => {
            const Icono = iconosTipo[tipo];
            return (
              <div key={tipo} className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition">
                <Icono size={22} className="mx-auto mb-1 text-blue-600" />
                <div className="text-2xl font-extrabold text-gray-800 dark:text-slate-100">{posts.filter((p) => p.tipo === tipo).length}</div>
                <div className="text-xs text-slate-400 mt-0.5 font-medium">{tipo}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-5 flex items-center gap-1.5"><BarChart3 size={16} className="text-blue-600" /> Mi progreso</h3>
            {["Diario", "Planeación", "Narrativa", "Extra"].map((tipo) => {
              const count = posts.filter((p) => p.tipo === tipo).length;
              const pct = Math.min((count / metas[tipo]) * 100, 100);
              const Icono = iconosTipo[tipo];
              return (
                <div key={tipo} className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Icono size={13} /> {tipo}</span>
                    <span className="text-slate-400 font-medium">{count}/{metas[tipo]}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barraColores[tipo]} rounded-full transition-all shadow-sm`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{pct.toFixed(0)}% completado</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-5 flex items-center gap-1.5"><Newspaper size={16} className="text-blue-600" /> Últimas publicaciones</h3>
            {posts.slice(0, 5).map((post) => {
              const Icono = iconosTipo[post.tipo] || Newspaper;
              return (
                <div key={post.id} className="flex items-start gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:mb-0 last:pb-0">
                  <Icono size={18} className="flex-shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coloresTipo[post.tipo] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                      {post.tipo}
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{post.contenido}</p>
                  </div>
                </div>
              );
            })}
            {posts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aún no tienes publicaciones.</p>
            )}
          </div>

        </div>

        <div className="mt-5">
          <MapaCalor posts={posts} email={user?.email} />
        </div>

        <div className="mt-5">
          <Insignias posts={posts} email={user?.email} nombre={user?.displayName} />
        </div>

      </div>

      <ResumenWrapped
        visible={showWrapped}
        onClose={() => setShowWrapped(false)}
        posts={posts}
        user={user}
      />
    </div>
  );
}