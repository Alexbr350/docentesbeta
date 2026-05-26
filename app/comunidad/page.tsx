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
        router.push("/login");
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
    router.push("/login");
  };

  const preguntasFiltradas = filtro === "Todas" ? preguntas : filtro === "Resueltas" ? preguntas.filter(p => p.resuelto) : preguntas.filter(p => !p.resuelto);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Cargando comunidad...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Docentes<span className="text-green-600">Beta</span></h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-800">Feed</button>
          <button onClick={() => router.push("/portafolio")} className="text-sm text-gray-500 hover:text-gray-800">Mi portafolio</button>
          <button onClick={() => router.push("/comunidad")} className="text-sm text-green-600 font-medium">Comunidad</button>
          <button onClick={() => router.push("/perfil")} className="text-sm text-gray-500 hover:text-gray-800">Mi perfil</button>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Comunidad DocentesBeta</h2>
            <p className="text-sm text-gray-500 mt-1">Comparte dudas y ayuda a otros docentes</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-xl">
            + Hacer una pregunta
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-800 mb-4">Nueva pregunta</h3>
            <input
              type="text"
              placeholder="Título de tu pregunta..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 mb-3 focus:outline-none focus:border-green-400"
            />
            <textarea
              placeholder="Describe tu situación con más detalle..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none focus:border-green-400"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setTitulo(""); setDescripcion(""); }} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={publicando || !titulo.trim() || !descripcion.trim()}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl disabled:opacity-50"
              >
                {publicando ? "Publicando..." : "Publicar pregunta"}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {["Todas", "Sin resolver", "Resueltas"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${filtro === f ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-500 hover:border-green-400"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {preguntasFiltradas.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No hay preguntas todavía. ¡Sé el primero en preguntar!
          </div>
        )}

        {preguntasFiltradas.map((pregunta) => (
          <div key={pregunta.id} className={`bg-white rounded-2xl border p-5 mb-4 ${pregunta.resuelto ? "border-green-200" : "border-gray-200"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {pregunta.autor?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{pregunta.autor}</p>
                  <p className="text-xs text-gray-400">
                    {pregunta.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${pregunta.resuelto ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {pregunta.resuelto ? "Resuelto ✓" : "Sin resolver"}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">{pregunta.titulo}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{pregunta.descripcion}</p>

            <div className="flex gap-3 border-t border-gray-100 pt-3">
              <button
                onClick={() => toggleRespuestas(pregunta.id)}
                className="text-xs text-gray-400 hover:text-blue-500"
              >
                💬 {showRespuestas[pregunta.id] ? "Ocultar respuestas" : "Ver respuestas"}
              </button>
              {pregunta.email === user?.email && !pregunta.resuelto && (
                <button
                  onClick={() => marcarResuelto(pregunta.id)}
                  className="text-xs text-green-500 hover:text-green-700 font-medium"
                >
                  ✓ Marcar como resuelto
                </button>
              )}
            </div>

            {showRespuestas[pregunta.id] && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {respuestas[pregunta.id]?.length === 0 && (
                  <p className="text-xs text-gray-400 mb-3">Aún no hay respuestas.</p>
                )}
                {respuestas[pregunta.id]?.map((r: any) => (
                  <div key={r.id} className="flex gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {r.autor?.charAt(0).toUpperCase()}
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                      <p className="text-xs font-medium text-gray-700">{r.autor}</p>
                      <p className="text-xs text-gray-600">{r.texto}</p>
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
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400"
                  />
                  <button
                    onClick={() => responder(pregunta.id)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl"
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