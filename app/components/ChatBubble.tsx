"use client";
import { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import SelectorEmojis from "./SelectorEmojis";

// Reacciones rápidas predefinidas: emojis grandes con fondo de color que se
// envían como mensaje con un solo toque. Se decidió por esta opción en vez
// de la API de GIPHY porque, aunque GIPHY tiene una capa gratuita, requiere
// registrar una app y obtener una clave nueva (con límite de 100
// llamadas/hora) — estas reacciones no necesitan ninguna clave ni servicio
// externo, y para un chat entre compañeros de práctica son suficientes.
const STICKERS: { emoji: string; etiqueta: string; color: string }[] = [
  { emoji: "👍", etiqueta: "Genial", color: "bg-blue-500" },
  { emoji: "❤️", etiqueta: "Me encanta", color: "bg-rose-500" },
  { emoji: "😂", etiqueta: "Jaja", color: "bg-amber-500" },
  { emoji: "👏", etiqueta: "Bien hecho", color: "bg-emerald-500" },
  { emoji: "🎉", etiqueta: "Felicidades", color: "bg-purple-500" },
  { emoji: "🤔", etiqueta: "Interesante", color: "bg-slate-500" },
];

// Detecta si un mensaje es "solo emoji" (sin texto normal), para mostrarlo
// más grande en la burbuja, como una reacción visual en vez de texto plano.
function esSoloEmoji(texto: string): boolean {
  const limpio = texto.trim();
  if (!limpio) return false;
  return /^[\p{Extended_Pictographic}\u200D\uFE0F\s]+$/u.test(limpio);
}

export default function ChatBubble() {
  const [user, setUser] = useState<any>(null);
  const [abierto, setAbierto] = useState(false);
  const [amigos, setAmigos] = useState<any[]>([]);
  const [amigoSeleccionado, setAmigoSeleccionado] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const enviarTexto = async (texto: string) => {
    if (!texto.trim() || !amigoSeleccionado) return;
    const convId = idConversacion(user.email, amigoSeleccionado.email);
    await addDoc(collection(db, "mensajes"), {
      conversacion: convId,
      de: user.email,
      deNombre: user.displayName || user.email,
      para: amigoSeleccionado.email,
      texto,
      fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: amigoSeleccionado.email,
      de: user.displayName || user.email,
      mensaje: "te envió un mensaje 💬",
      leida: false,
      fecha: serverTimestamp(),
    });
    await abrirChat(amigoSeleccionado);
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;
    const texto = nuevoMensaje;
    setNuevoMensaje("");
    await enviarTexto(texto);
  };

  const enviarSticker = async (emoji: string) => {
    await enviarTexto(emoji);
  };

  if (!user) return null;

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-6 right-4 md:right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl z-40 transition active:scale-95"
      >
        💬
      </button>

      {/* Panel de chat */}
      {abierto && (
        <div className="fixed bottom-24 right-4 left-4 md:left-auto md:right-6 w-auto md:w-80 max-w-full md:max-w-none bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-40 flex flex-col overflow-hidden" style={{ height: "480px", maxHeight: "70vh" }}>

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
                    className="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {amigo.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{amigo.nombre}</p>
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
                    {esSoloEmoji(m.texto) ? (
                      <div className="max-w-[75%] px-2 py-1 text-4xl leading-none">
                        {m.texto}
                      </div>
                    ) : (
                      <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-xs ${m.de === user?.email ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                        {m.texto}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Carrusel de stickers/reacciones rápidas */}
              <div className="px-2 pt-1.5 pb-1 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
                {STICKERS.map((s) => (
                  <button
                    key={s.etiqueta}
                    onClick={() => enviarSticker(s.emoji)}
                    title={s.etiqueta}
                    className={`flex-shrink-0 w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-xl shadow-sm hover:shadow-md transition active:scale-90`}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>

              <div className="p-2 flex gap-2 items-center">
                <SelectorEmojis
                  valor={nuevoMensaje}
                  onCambiar={setNuevoMensaje}
                  obtenerElemento={() => inputRef.current}
                  posicionPanel="bottom-full mb-2 left-0"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                />
                <button onClick={enviarMensaje} className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95">
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
