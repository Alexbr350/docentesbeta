"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import Navbar from "../components/Navbar";

export default function Chat() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [amigos, setAmigos] = useState<any[]>([]);
  const [amigoSeleccionado, setAmigoSeleccionado] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      setUser(currentUser);
      cargarAmigos(currentUser.email || "");
    });
    return () => unsubscribe();
  }, [router]);

  const cargarAmigos = async (email: string) => {
    const snap = await getDocs(query(collection(db, "amigos"), where("usuario", "==", email)));
    const postsSnap = await getDocs(collection(db, "posts"));
    const lista = snap.docs.map((d) => {
      const amigoEmail = d.data().amigo;
      const nombre = postsSnap.docs.find((p) => p.data().email === amigoEmail)?.data().autor || amigoEmail;
      return { email: amigoEmail, nombre };
    });
    setAmigos(lista);
    setLoading(false);
  };

  const idConversacion = (email1: string, email2: string) => {
    return [email1, email2].sort().join("_");
  };

  const abrirChat = async (amigo: any) => {
    setAmigoSeleccionado(amigo);
    const convId = idConversacion(user.email, amigo.email);
    const q = query(collection(db, "mensajes"), where("conversacion", "==", convId), orderBy("fecha", "asc"));
    const snap = await getDocs(q);
    setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !amigoSeleccionado) return;
    const convId = idConversacion(user.email, amigoSeleccionado.email);
    await addDoc(collection(db, "mensajes"), {
      conversacion: convId,
      de: user.email,
      deNombre: user.displayName || user.email,
      para: amigoSeleccionado.email,
      texto: nuevoMensaje,
      fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: amigoSeleccionado.email,
      de: user.displayName || user.email,
      mensaje: "te envió un mensaje 💬",
      leida: false,
      fecha: serverTimestamp(),
    });
    setNuevoMensaje("");
    await abrirChat(amigoSeleccionado);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <p className="text-slate-400 text-sm">Cargando chat...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar paginaActual="Chat" />

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-3 gap-5">

        {/* Lista de amigos */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mis amigos</p>
            {amigos.length === 0 && <p className="text-xs text-slate-400">No tienes amigos todavía.</p>}
            {amigos.map((amigo) => (
              <div
                key={amigo.email}
                onClick={() => abrirChat(amigo)}
                className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition mb-1 ${amigoSeleccionado?.email === amigo.email ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {amigo.nombre?.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-slate-700">{amigo.nombre}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="col-span-2">
          {!amigoSeleccionado && (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm shadow-md">
              Selecciona un amigo para empezar a chatear.
            </div>
          )}
          {amigoSeleccionado && (
            <div className="bg-white rounded-2xl shadow-md flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {amigoSeleccionado.nombre?.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-bold text-gray-800">{amigoSeleccionado.nombre}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensajes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center">Aún no hay mensajes. ¡Escribe el primero!</p>
                )}
                {mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.de === user?.email ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${m.de === user?.email ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {m.texto}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
                <button onClick={enviarMensaje} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}