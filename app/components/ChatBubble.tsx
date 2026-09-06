"use client";
import { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import SelectorEmojis from "./SelectorEmojis";
import StickersRapidos from "./StickersRapidos";
import { useChat, DestinoChat } from "./ChatContext";
import PuntoEnLinea from "./PuntoEnLinea";

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
  const [conversaciones, setConversaciones] = useState<DestinoChat[]>([]);
  const [amigoSeleccionado, setAmigoSeleccionado] = useState<DestinoChat | null>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { destinoSolicitado, limpiarDestinoSolicitado } = useChat();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        cargarConversaciones(currentUser.email || "");
      }
    });
    return () => unsubscribe();
  }, []);

  // Cuando otra página (ej. el botón "Responder en privado" de una
  // publicación de "Pedir ayuda" en page.tsx) pide abrir un chat puntual,
  // abrimos el panel directamente en esa conversación.
  useEffect(() => {
    if (destinoSolicitado && user) {
      setAbierto(true);
      abrirChat(destinoSolicitado);
      limpiarDestinoSolicitado();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinoSolicitado, user]);

  const cargarConversaciones = async (email: string) => {
    // Además de los amigos (para chatear normalmente), incluimos a cualquier
    // persona con la que ya exista un intercambio de mensajes real — esto es
    // necesario porque alguien puede escribirle a un no-amigo desde el botón
    // "Responder en privado" de una publicación de "Pedir ayuda" (ver
    // page.tsx), y esa persona debe poder ver y responder esa conversación
    // aunque no sean amigos.
    const [amigosSnap, postsSnap, enviadosSnap, recibidosSnap] = await Promise.all([
      getDocs(query(collection(db, "amigos"), where("usuario", "==", email))),
      getDocs(collection(db, "posts")),
      getDocs(query(collection(db, "mensajes"), where("de", "==", email))),
      getDocs(query(collection(db, "mensajes"), where("para", "==", email))),
    ]);

    const nombrePorEmail = (correo: string) =>
      postsSnap.docs.find((p) => p.data().email === correo)?.data().autor || correo;

    const mapa = new Map<string, DestinoChat>();

    amigosSnap.docs.forEach((d) => {
      const amigoEmail = d.data().amigo;
      mapa.set(amigoEmail, { email: amigoEmail, nombre: nombrePorEmail(amigoEmail) });
    });

    // Se recorren los mensajes existentes (enviados y recibidos) para
    // descubrir conversaciones con no-amigos y para propagar el "origen"
    // (postId de la publicación de "Pedir ayuda") a la lista — así, si se
    // vuelve a abrir el chat más tarde, los mensajes siguientes se siguen
    // etiquetando correctamente.
    [...enviadosSnap.docs, ...recibidosSnap.docs].forEach((d) => {
      const m = d.data();
      const otroEmail = m.de === email ? m.para : m.de;
      if (!otroEmail || otroEmail === email) return;
      const existente = mapa.get(otroEmail);
      const origen = m.origenPostId
        ? { postId: m.origenPostId, esPeticionAyuda: !!m.origenPeticionAyuda }
        : existente?.origen;
      mapa.set(otroEmail, {
        email: otroEmail,
        nombre: existente?.nombre || nombrePorEmail(otroEmail),
        origen,
      });
    });

    setConversaciones(Array.from(mapa.values()));
  };

  const idConversacion = (email1: string, email2: string) => [email1, email2].sort().join("_");

  const abrirChat = async (destino: DestinoChat) => {
    setAmigoSeleccionado(destino);
    const convId = idConversacion(user.email, destino.email);
    const q = query(collection(db, "mensajes"), where("conversacion", "==", convId), orderBy("fecha", "asc"));
    const snap = await getDocs(q);
    setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const enviarTexto = async (texto: string) => {
    if (!texto.trim() || !amigoSeleccionado) return;
    const convId = idConversacion(user.email, amigoSeleccionado.email);
    // Si esta conversación se originó desde una publicación de "Pedir ayuda"
    // (o cualquier otro "origen" que justifique chatear sin ser amigos),
    // etiquetamos también los mensajes de respuesta con el mismo postId —
    // así la regla de seguridad de Firestore puede verificarlo en cada
    // mensaje, no solo en el primero.
    const etiquetaOrigen = amigoSeleccionado.origen
      ? {
          origenPostId: amigoSeleccionado.origen.postId,
          origenPeticionAyuda: !!amigoSeleccionado.origen.esPeticionAyuda,
        }
      : {};
    await addDoc(collection(db, "mensajes"), {
      conversacion: convId,
      de: user.email,
      deNombre: user.displayName || user.email,
      para: amigoSeleccionado.email,
      texto,
      fecha: serverTimestamp(),
      ...etiquetaOrigen,
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
                {conversaciones.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 px-4">Agrega amigos en la sección de Usuarios para poder chatear.</p>
                )}
                {conversaciones.map((conv) => (
                  <div
                    key={conv.email}
                    onClick={() => abrirChat(conv)}
                    className="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {conv.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <PuntoEnLinea email={conv.email} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{conv.nombre}</p>
                      {conv.origen?.esPeticionAyuda && (
                        <p className="text-[10px] text-blue-500 font-semibold truncate">Por una petición de ayuda</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {amigoSeleccionado && (
            <>
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <button onClick={() => setAmigoSeleccionado(null)} className="text-white text-sm">←</button>
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {amigoSeleccionado.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <PuntoEnLinea email={amigoSeleccionado.email} posicion="absolute -bottom-0.5 -right-0.5" tamano={8} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{amigoSeleccionado.nombre}</p>
                  {amigoSeleccionado.origen?.esPeticionAyuda && (
                    <p className="text-[10px] text-blue-300 truncate">Respondiendo a su petición de ayuda</p>
                  )}
                </div>
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
              <div className="px-2 pt-1.5 pb-1 border-t border-slate-100 dark:border-slate-800">
                <StickersRapidos onSeleccionar={enviarSticker} />
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
