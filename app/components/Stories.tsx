"use client";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Plus, X, Send, Heart, Trash2, Camera, Video, Upload, Circle } from "lucide-react";
import ModalConfirmar from "./ModalConfirmar";
import { useToast } from "./Toast";

export default function Stories() {
  const { mostrarToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<any[] | null>(null);
  const [indiceActual, setIndiceActual] = useState(0);
  const [barraLlena, setBarraLlena] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const timeoutRef = useRef<any>(null);

  const [modoCamara, setModoCamara] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [streamCamara, setStreamCamara] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        cargarStories();
      }
    });
    return () => unsubscribe();
  }, []);

  const cargarStories = async () => {
    const hace24h = new Date();
    hace24h.setHours(hace24h.getHours() - 24);

    const snap = await getDocs(query(collection(db, "stories"), orderBy("fecha", "desc")));
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => s.fecha?.toDate?.() > hace24h);
    setStories(data);
  };

  const abrirCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStreamCamara(stream);
      setModoCamara(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      mostrarToast("No se pudo acceder a la cámara. Verifica los permisos.", "error");
    }
  };

  const cerrarCamara = () => {
    if (streamCamara) streamCamara.getTracks().forEach((t) => t.stop());
    setStreamCamara(null);
    setModoCamara(false);
    setGrabando(false);
  };

  const tomarFoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
        setArchivoSeleccionado(file);
        cerrarCamara();
        setShowUpload(true);
      }
    }, "image/jpeg", 0.9);
  };

  const iniciarGrabacion = () => {
    if (!streamCamara) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamCamara, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], "video.webm", { type: "video/webm" });
      setArchivoSeleccionado(file);
      cerrarCamara();
      setShowUpload(true);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setGrabando(true);

    // Máximo 15 segundos
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        setGrabando(false);
      }
    }, 15000);
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setGrabando(false);
    }
  };

  const subirStory = async () => {
    if (!archivoSeleccionado || !user) return;
    setSubiendo(true);
    const formData = new FormData();
    formData.append("file", archivoSeleccionado);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    const esVideo = archivoSeleccionado.type.startsWith("video/");
    await addDoc(collection(db, "stories"), {
      imagenUrl: data.secure_url,
      esVideo,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
    });

    setArchivoSeleccionado(null);
    setShowUpload(false);
    setSubiendo(false);
    cargarStories();
  };

  const storiesPorAutor = stories.reduce((acc: any, story: any) => {
    if (!acc[story.email]) acc[story.email] = [];
    acc[story.email].push(story);
    return acc;
  }, {});

  const autores = Object.keys(storiesPorAutor);

  const abrirGrupo = (grupo: any[]) => {
    setGrupoSeleccionado(grupo);
    setIndiceActual(0);
  };

  const cerrarVisor = () => {
    setGrupoSeleccionado(null);
    setIndiceActual(0);
    setRespuesta("");
    setBarraLlena(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const siguienteHistoria = () => {
    if (!grupoSeleccionado) return;
    if (indiceActual < grupoSeleccionado.length - 1) {
      setIndiceActual((prev) => prev + 1);
      setRespuesta("");
    } else {
      cerrarVisor();
    }
  };

  const anteriorHistoria = () => {
    if (indiceActual > 0) {
      setIndiceActual((prev) => prev - 1);
      setRespuesta("");
    }
  };

  useEffect(() => {
    if (!grupoSeleccionado) return;
    const esVideoActual = grupoSeleccionado[indiceActual]?.esVideo;
    setBarraLlena(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const inicio = setTimeout(() => setBarraLlena(true), 50);
    // Si es video, el avance lo controla el evento onEnded del <video>; si es imagen, avanzamos a los 5s
    let avance: any = null;
    if (!esVideoActual) {
      avance = setTimeout(() => siguienteHistoria(), 5000);
      timeoutRef.current = avance;
    }

    return () => {
      clearTimeout(inicio);
      if (avance) clearTimeout(avance);
    };
  }, [grupoSeleccionado, indiceActual]);

  const eliminarStory = async () => {
    if (!grupoSeleccionado) return;
    const story = grupoSeleccionado[indiceActual];
    setConfirmarEliminar(false);
    await deleteDoc(doc(db, "stories", story.id));
    if (grupoSeleccionado.length === 1) {
      cerrarVisor();
    } else {
      const nuevoGrupo = grupoSeleccionado.filter((s) => s.id !== story.id);
      setGrupoSeleccionado(nuevoGrupo);
      setIndiceActual((prev) => Math.min(prev, nuevoGrupo.length - 1));
    }
    cargarStories();
  };

  const enviarReaccion = async (texto: string) => {
    if (!grupoSeleccionado || !user) return;
    const story = grupoSeleccionado[indiceActual];
    await addDoc(collection(db, "notificaciones"), {
      para: story.email,
      de: user.displayName || user.email,
      mensaje: `reaccionó a tu historia: "${texto}"`,
      leida: false,
      fecha: serverTimestamp(),
    });
    setRespuesta("");
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {storiesPorAutor[user?.email] ? (
            <button onClick={() => abrirGrupo(storiesPorAutor[user?.email])} className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                {storiesPorAutor[user?.email][0].esVideo ? (
                  <div className="w-full h-full rounded-full bg-slate-800 border-2 border-white flex items-center justify-center">
                    <Video size={20} className="text-white" />
                  </div>
                ) : (
                  <img src={storiesPorAutor[user?.email][0].imagenUrl} alt="Tu historia" className="w-full h-full rounded-full object-cover border-2 border-white" />
                )}
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); setShowUpload(true); }}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white"
              >
                <Plus size={11} className="text-white" />
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowUpload(true)}
              className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center hover:border-blue-400 transition"
            >
              <Plus size={22} className="text-slate-400" />
            </button>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tu historia</span>
        </div>

        {autores.filter((email) => email !== user?.email).map((email) => {
          const storiesDelAutor = storiesPorAutor[email];
          const primera = storiesDelAutor[0];
          return (
            <div key={email} className="flex flex-col items-center gap-1 flex-shrink-0">
              <button onClick={() => abrirGrupo(storiesDelAutor)} className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                {primera.esVideo ? (
                  <div className="w-full h-full rounded-full bg-slate-800 border-2 border-white flex items-center justify-center">
                    <Video size={20} className="text-white" />
                  </div>
                ) : (
                  <img src={primera.imagenUrl} alt={primera.autor} className="w-full h-full rounded-full object-cover border-2 border-white" />
                )}
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate w-16 text-center">{primera.autor?.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Modal de subir historia */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full animate-modal-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">Subir historia</h3>
              <button onClick={() => { setShowUpload(false); setArchivoSeleccionado(null); }} className="p-1 -m-1"><X size={18} className="text-slate-400" /></button>
            </div>

            {!archivoSeleccionado ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={abrirCamara}
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 hover:border-blue-400 transition"
                >
                  <Camera size={22} className="text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">Usar cámara</span>
                </button>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 cursor-pointer hover:border-blue-400 transition">
                  <Upload size={22} className="text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">Subir archivo</span>
                  <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)} />
                </label>
              </div>
            ) : (
              <div className="mb-4 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center" style={{ maxHeight: "260px" }}>
                {archivoSeleccionado.type.startsWith("video/") ? (
                  <video src={URL.createObjectURL(archivoSeleccionado)} controls className="w-full max-h-64" />
                ) : (
                  <img src={URL.createObjectURL(archivoSeleccionado)} alt="" className="w-full max-h-64 object-contain" />
                )}
              </div>
            )}

            <p className="text-xs text-slate-400 mb-4 text-center">Tu historia será visible por 24 horas</p>
            <div className="flex gap-2">
              {archivoSeleccionado && (
                <button
                  onClick={() => setArchivoSeleccionado(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl"
                >
                  Cambiar
                </button>
              )}
              <button
                onClick={subirStory}
                disabled={!archivoSeleccionado || subiendo}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition active:scale-95"
              >
                {subiendo ? "Subiendo..." : "Publicar historia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cámara en vivo */}
      {modoCamara && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center animate-fade-in">
          <button onClick={cerrarCamara} className="absolute top-6 right-4 text-white z-10 p-2">
            <X size={28} />
          </button>
          <video ref={videoRef} autoPlay playsInline muted className="w-[calc(100%-2rem)] md:w-full max-w-md rounded-xl" />
          <div className="flex items-center gap-6 mt-8">
            <button
              onClick={tomarFoto}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl active:scale-90 transition"
            >
              <Camera size={26} className="text-slate-800" />
            </button>
            {!grabando ? (
              <button
                onClick={iniciarGrabacion}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-90 transition"
              >
                <Circle size={26} className="text-white" fill="white" />
              </button>
            ) : (
              <button
                onClick={detenerGrabacion}
                className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-xl animate-pulse"
              >
                <div className="w-6 h-6 bg-white rounded-sm" />
              </button>
            )}
          </div>
          <p className="text-white/60 text-xs mt-4">{grabando ? "Grabando... (máx. 15s)" : "Toca para foto o mantén para video"}</p>
        </div>
      )}

      {/* Visor de historias */}
      {grupoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 animate-fade-in">
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {grupoSeleccionado.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < indiceActual ? "100%" : i === indiceActual && barraLlena ? "100%" : "0%",
                    transition: i === indiceActual && !grupoSeleccionado[indiceActual]?.esVideo ? "width 5s linear" : "none",
                  }}
                />
              </div>
            ))}
          </div>

          <button onClick={cerrarVisor} className="absolute top-8 right-4 text-white z-20 p-2">
            <X size={28} />
          </button>

          <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={anteriorHistoria}></div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={siguienteHistoria}></div>

          <div className="max-w-md w-full px-4 relative z-10">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-lg">
                {grupoSeleccionado[indiceActual].autor?.charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-sm font-semibold drop-shadow">{grupoSeleccionado[indiceActual].autor}</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {grupoSeleccionado[indiceActual].esVideo ? (
                <video
                  key={grupoSeleccionado[indiceActual].id}
                  src={grupoSeleccionado[indiceActual].imagenUrl}
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-h-[65vh] object-contain bg-black/40"
                  onEnded={siguienteHistoria}
                />
              ) : (
                <img src={grupoSeleccionado[indiceActual].imagenUrl} alt="" className="w-full max-h-[65vh] object-contain bg-black/40" />
              )}
            </div>

            {grupoSeleccionado[indiceActual].email === user?.email ? (
              <div className="flex justify-center mt-5 relative z-20">
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  className="group w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-red-500 border border-white/20 hover:border-red-500 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                >
                  <Trash2 size={17} className="text-red-400 group-hover:text-white transition-all duration-300 group-hover:rotate-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-4 relative z-20">
                <input
                  type="text"
                  placeholder="Envía un mensaje..."
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && respuesta.trim() && enviarReaccion(respuesta)}
                  className="flex-1 bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-white"
                />
                <button onClick={() => enviarReaccion("❤️")} className="text-white hover:scale-110 transition">
                  <Heart size={22} />
                </button>
                {respuesta.trim() && (
                  <button onClick={() => enviarReaccion(respuesta)} className="text-white hover:scale-110 transition">
                    <Send size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ModalConfirmar
        visible={confirmarEliminar}
        mensaje="¿Eliminar esta historia?"
        destructivo
        onConfirmar={eliminarStory}
        onCancelar={() => setConfirmarEliminar(false)}
      />
    </>
  );
}