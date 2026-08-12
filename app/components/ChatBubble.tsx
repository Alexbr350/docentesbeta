"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";

export default function ChatBubble() {
  const [user, setUser] = useState<any>(null);
  const [abierto, setAbierto] = useState(false);
  const [amigos, setAmigos] = useState<any[]>([]);
  const [amigoSeleccionado, setAmigoSeleccionado] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        cargarAmigos(currentUser.email || "");
      }
    });
    return () => unsubscribe();
  }, []);

  const cargarAmigos = async (email: string) => {
    const snap = await getDocs(query(collection(db, "amigos"), where("usuario", "==", email)));
    const postsSnap = await getDocs(collection(db, "posts"));
    const lista = snap.docs.map((d) => {
      const amigoEmail = d.data().amigo;
      const nombre = postsSnap.docs.find((p) => p.data().email === amigoEmail)?.data().autor || amigoEmail;
      return { email: amigoEmail, nombre };
    });
    setAmigos(lista);
  };

  const idConversacion = (email1: string, email2: string) => [email1, email2].sort().join("_");

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

  if (!user) return null;

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl z-40 transition"
      >
        💬
      </button>

      {/* Panel de chat */}
      {abierto && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 flex flex-col overflow-hidden" style={{ height: "480px" }}>
          
          {!amigoSeleccionado && (
            <>
              <div className="bg-slate-900 px-4 py-3">
                <p className="text-sm font-bold text-white">💬 Mensajes</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {amigos.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 px-4">Agrega amigos en la sección de Usuarios para poder chatear.</p>
                )}
                {amigos.map((amigo) => (
                  <div
                    key={amigo.email}
                    onClick={() => abrirChat(amigo)}
                    className="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-50 transition"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {amigo.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 truncate">{amigo.nombre}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {amigoSeleccionado && (
            <>
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <button onClick={() => setAmigoSeleccionado(null)} className="text-white text-sm">←</button>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {amigoSeleccionado.nombre?.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-bold text-white truncate">{amigoSeleccionado.nombre}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {mensajes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center">Aún no hay mensajes. ¡Escribe el primero!</p>
                )}
                {mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.de === user?.email ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-xs ${m.de === user?.email ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {m.texto}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                />
                <button onClick={enviarMensaje} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold">
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}