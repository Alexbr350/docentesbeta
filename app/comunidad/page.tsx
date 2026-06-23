"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, updateDoc } from "firebase/firestore";

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
        <p className="text-slate-400 text-sm">Cargando comunidad...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Navbar */}
      <nav className="bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA</p>
            <h1 className="text-sm font-bold text-white leading-tight">Docentes<span className="text-blue-400">Beta</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["Feed", "Portafolio", "Comunidad", "Perfil", "Usuarios"].map((item) => (
            <button
              key={item}
              onClick={() => item === "Feed" ? router.push("/") : router.push(`/${item.toLowerCase()}`)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${item === "Comunidad" ? "text-white bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              {item}
            </button>
          ))}
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🤝</div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Comunidad DocentesBeta</h2>
              <p className="text-sm text-slate-400 mt-0.5">Comparte dudas y ayuda a otros docentes</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg transition"
          >
            + Hacer una pregunta
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-blue-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4">💬 Nueva pregunta</h3>
            <input
              type="text"
              placeholder="Título de tu pregunta..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 mb-3 focus:outline-none focus:border-blue-400"
            />
            <textarea
              placeholder="Describe tu situación con más detalle..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-blue-400"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setTitulo(""); setDescripcion(""); }} className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2">
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={publicando || !titulo.trim() || !descripcion.trim()}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow"
              >
                {publicando ? "Publicando..." : "Publicar pregunta"}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { num: preguntas.length, label: "Total preguntas", icon: "❓" },
            { num: preguntas.filter(p => p.resuelto).length, label: "Resueltas", icon: "✅" },
            { num: preguntas.filter(p => !p.resuelto).length, label: "Sin resolver", icon: "⏳" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-md">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{s.num}</div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-5">
          {["Todas", "Sin resolver", "Resueltas"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-4 py-1.5 rounded-full border transition font-semibold ${filtro === f ? "bg-slate-900 text-white border-slate-900 shadow-md" : "border-slate-200 text-slate-500 bg-white hover:border-slate-400"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Preguntas */}
        {preguntasFiltradas.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
            No hay preguntas todavía. ¡Sé el primero en preguntar!
          </div>
        )}

        {preguntasFiltradas.map((pregunta) => (
          <div key={pregunta.id} className={`bg-white rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition border-l-4 ${pregunta.resuelto ? "border-emerald-400" : "border-red-400"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                  {pregunta.autor?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{pregunta.autor}</p>
                  <p className="text-xs text-slate-400">
                    {pregunta.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${pregunta.resuelto ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {pregunta.resuelto ? "✅ Resuelto" : "⏳ Sin resolver"}
              </span>
            </div>

            <h3 className="text-sm font-bold text-gray-800 mb-2">{pregunta.titulo}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{pregunta.descripcion}</p>

            <div className="flex gap-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => toggleRespuestas(pregunta.id)}
                className="text-xs text-slate-400 hover:text-blue-500 font-semibold transition"
              >
                💬 {showRespuestas[pregunta.id] ? "Ocultar respuestas" : "Ver respuestas"}
              </button>
              {pregunta.email === user?.email && !pregunta.resuelto && (
                <button
                  onClick={() => marcarResuelto(pregunta.id)}
                  className="text-xs text-emerald-500 hover:text-emerald-700 font-semibold transition"
                >
                  ✓ Marcar como resuelto
                </button>
              )}
            </div>

            {showRespuestas[pregunta.id] && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {respuestas[pregunta.id]?.length === 0 && (
                  <p className="text-xs text-slate-400 mb-3">Aún no hay respuestas. ¡Sé el primero en ayudar!</p>
                )}
                {respuestas[pregunta.id]?.map((r: any) => (
                  <div key={r.id} className="flex gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {r.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1">
                      <p className="text-xs font-bold text-gray-700">{r.autor}</p>
                      <p className="text-xs text-slate-600">{r.texto}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Escribe tu respuesta..."
                    value={nuevaRespuesta[pregunta.id] || ""}
                    onChange={(e) => setNuevaRespuesta((prev: any) => ({ ...prev, [pregunta.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && responder(pregunta.id)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => responder(pregunta.id)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold"
                  >
                    Responder
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}