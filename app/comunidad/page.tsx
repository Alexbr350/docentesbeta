"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import Navbar from "../components/Navbar";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { HelpCircle, MessageCircle, CheckCircle2, Send, Sparkles } from "lucide-react";
import ModalSugerenciaIA from "../components/ModalSugerenciaIA";
import Spinner from "../components/Spinner";

export default function Comunidad() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [filtro, setFiltro] = useState("Todas");
  const [showRespuestas, setShowRespuestas] = useState<any>({});
  const [respuestas, setRespuestas] = useState<any>({});
  const [nuevaRespuesta, setNuevaRespuesta] = useState<any>({});
  const [preguntaParaSugerenciaIA, setPreguntaParaSugerenciaIA] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/landing");
      } else {
        setUser(user);
        cargarPreguntas();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const cargarPreguntas = async () => {
    const q = query(collection(db, "comunidad"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPreguntas(data);
    setLoading(false);
  };

  const publicar = async () => {
    if (!titulo.trim() || !descripcion.trim()) return;
    setPublicando(true);
    await addDoc(collection(db, "comunidad"), {
      titulo,
      descripcion,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
      resuelto: false,
    });
    setTitulo("");
    setDescripcion("");
    setShowForm(false);
    setPublicando(false);
    cargarPreguntas();
  };

  const marcarResuelto = async (id: string) => {
    await updateDoc(doc(db, "comunidad", id), { resuelto: true });
    setPreguntas(preguntas.map((p) => p.id === id ? { ...p, resuelto: true } : p));
  };

  const cargarRespuestas = async (id: string) => {
    const q = query(collection(db, "comunidad", id, "respuestas"), orderBy("fecha", "asc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setRespuestas((prev: any) => ({ ...prev, [id]: data }));
  };

  const toggleRespuestas = async (id: string) => {
    if (!showRespuestas[id]) await cargarRespuestas(id);
    setShowRespuestas((prev: any) => ({ ...prev, [id]: !prev[id] }));
  };

  const responder = async (id: string) => {
    const texto = nuevaRespuesta[id];
    if (!texto?.trim()) return;
    await addDoc(collection(db, "comunidad", id, "respuestas"), {
      texto,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
    });
    setNuevaRespuesta((prev: any) => ({ ...prev, [id]: "" }));
    await cargarRespuestas(id);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const preguntasFiltradas = filtro === "Todas" ? preguntas : filtro === "Resueltas" ? preguntas.filter(p => p.resuelto) : preguntas.filter(p => !p.resuelto);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <Spinner texto="Cargando comunidad..." />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Comunidad" />

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-4">
            <HelpCircle size={32} className="text-purple-400" />
            <div>
              <h2 className="text-lg font-extrabold text-white">Comunidad ENSFA+</h2>
              <p className="text-sm text-slate-400 mt-0.5">Comparte dudas y ayuda a otros docentes</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95"
          >
            + Hacer una pregunta
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-6 shadow-lg border border-blue-100">
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5"><MessageCircle size={16} className="text-blue-600" /> Nueva pregunta</h3>
            <input
              type="text"
              placeholder="Título de tu pregunta..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mb-3 focus:outline-none focus:border-blue-400"
            />
            <textarea
              placeholder="Describe tu situación con más detalle..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:border-blue-400"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setTitulo(""); setDescripcion(""); }} className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2">
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={publicando || !titulo.trim() || !descripcion.trim()}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
              >
                {publicando ? "Publicando..." : "Publicar pregunta"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-5">
          {[
            { num: preguntas.length, label: "Total preguntas", icon: HelpCircle, color: "text-purple-500" },
            { num: preguntas.filter(p => p.resuelto).length, label: "Resueltas", icon: CheckCircle2, color: "text-emerald-500" },
            { num: preguntas.filter(p => !p.resuelto).length, label: "Sin resolver", icon: MessageCircle, color: "text-orange-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-md">
              <s.icon size={22} className={`mx-auto mb-1 ${s.color}`} />
              <div className="text-2xl font-extrabold text-gray-800 dark:text-slate-100">{s.num}</div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {["Todas", "Sin resolver", "Resueltas"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-4 py-1.5 rounded-full border transition font-semibold ${filtro === f ? "bg-slate-900 text-white border-slate-900 shadow-md" : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-400"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {preguntasFiltradas.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
            No hay preguntas todavía. ¡Sé el primero en preguntar!
          </div>
        )}

        {preguntasFiltradas.map((pregunta) => (
          <div key={pregunta.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition border-l-4 ${pregunta.resuelto ? "border-emerald-400" : "border-red-400"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                  {pregunta.autor?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{pregunta.autor}</p>
                  <p className="text-xs text-slate-400">
                    {pregunta.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                  </p>
                </div>
              </div>
              <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold ${pregunta.resuelto ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"}`}>
                {pregunta.resuelto ? <><CheckCircle2 size={12} /> Resuelto</> : "Sin resolver"}
              </span>
            </div>

            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-2">{pregunta.titulo}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{pregunta.descripcion}</p>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={() => toggleRespuestas(pregunta.id)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 font-semibold transition"
              >
                <MessageCircle size={14} /> {showRespuestas[pregunta.id] ? "Ocultar respuestas" : "Ver respuestas"}
              </button>
              {pregunta.email === user?.email && !pregunta.resuelto && (
                <button
                  onClick={() => marcarResuelto(pregunta.id)}
                  className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-700 font-semibold transition"
                >
                  <CheckCircle2 size={14} /> Marcar como resuelto
                </button>
              )}
            </div>

            {showRespuestas[pregunta.id] && (
              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                {respuestas[pregunta.id]?.length === 0 && (
                  <p className="text-xs text-slate-400 mb-3">Aún no hay respuestas. ¡Sé el primero en ayudar!</p>
                )}
                {respuestas[pregunta.id]?.map((r: any) => (
                  <div key={r.id} className="flex gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {r.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{r.autor}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{r.texto}</p>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPreguntaParaSugerenciaIA(pregunta)}
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 px-3 py-2 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-950/50 transition font-medium mb-2"
                >
                  <Sparkles size={14} /> Sugerir respuesta con IA
                </button>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Escribe tu respuesta..."
                    value={nuevaRespuesta[pregunta.id] || ""}
                    onChange={(e) => setNuevaRespuesta((prev: any) => ({ ...prev, [pregunta.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && responder(pregunta.id)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => responder(pregunta.id)}
                    className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95"
                  >
                    <Send size={13} /> Responder
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <ModalSugerenciaIA
          visible={!!preguntaParaSugerenciaIA}
          contenidoPost={preguntaParaSugerenciaIA ? `${preguntaParaSugerenciaIA.titulo}\n\n${preguntaParaSugerenciaIA.descripcion}` : ""}
          tipo="pregunta de la comunidad"
          colorTema="purple"
          tarea="respuesta_comunidad"
          titulo="Sugerencia de respuesta (IA)"
          etiquetaBorrador="Borrador de respuesta — puedes editarlo antes de usarlo"
          textoCargando="Pensando una respuesta..."
          textoAyuda="Este texto solo se colocará en el campo de respuesta. Tú decides si lo editas y cuándo enviarlo."
          textoBotonUsar="Usar este borrador"
          onUsar={(texto) => {
            if (preguntaParaSugerenciaIA) {
              setNuevaRespuesta((prev: any) => ({ ...prev, [preguntaParaSugerenciaIA.id]: texto }));
            }
            setPreguntaParaSugerenciaIA(null);
          }}
          onCancelar={() => setPreguntaParaSugerenciaIA(null)}
        />
      </div>
    </div>
  );
}