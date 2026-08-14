"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { Plus, X } from "lucide-react";

export default function Stories() {
  const [user, setUser] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [storySeleccionada, setStorySeleccionada] = useState<any>(null);

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

  const subirStory = async () => {
    if (!archivoSeleccionado || !user) return;
    setSubiendo(true);
    const formData = new FormData();
    formData.append("file", archivoSeleccionado);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    await addDoc(collection(db, "stories"), {
      imagenUrl: data.secure_url,
      autor: user.displayName || user.email,
      email: user.email,
      fecha: serverTimestamp(),
    });

    setArchivoSeleccionado(null);
    setShowUpload(false);
    setSubiendo(false);
    cargarStories();
  };

  // Agrupar stories por autor
  const storiesPorAutor = stories.reduce((acc: any, story: any) => {
    if (!acc[story.email]) acc[story.email] = [];
    acc[story.email].push(story);
    return acc;
  }, {});

  const autores = Object.keys(storiesPorAutor);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
        {/* Botón para subir tu historia */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowUpload(true)}
            className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-400 transition"
          >
            <Plus size={22} className="text-slate-400" />
          </button>
          <span className="text-xs text-slate-500 font-medium">Tu historia</span>
        </div>

        {/* Historias de otros */}
        {autores.map((email) => {
          const storiesDelAutor = storiesPorAutor[email];
          const primera = storiesDelAutor[0];
          return (
            <div key={email} className="flex flex-col items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setStorySeleccionada(storiesDelAutor)}
                className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
              >
                <img src={primera.imagenUrl} alt={primera.autor} className="w-full h-full rounded-full object-cover border-2 border-white" />
              </button>
              <span className="text-xs text-slate-500 font-medium truncate w-16 text-center">{primera.autor?.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Modal de subir historia */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-800">Subir historia</h3>
              <button onClick={() => setShowUpload(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition mb-4">
              <Plus size={24} className="text-slate-400" />
              <span className="text-xs text-slate-500">{archivoSeleccionado ? archivoSeleccionado.name : "Selecciona una imagen"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)} />
            </label>
            <p className="text-xs text-slate-400 mb-4 text-center">Tu historia será visible por 24 horas</p>
            <button
              onClick={subirStory}
              disabled={!archivoSeleccionado || subiendo}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
            >
              {subiendo ? "Subiendo..." : "Publicar historia"}
            </button>
          </div>
        </div>
      )}

      {/* Ver historia */}
      {storySeleccionada && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setStorySeleccionada(null)}>
          <button onClick={() => setStorySeleccionada(null)} className="absolute top-4 right-4 text-white z-10">
            <X size={28} />
          </button>
          <div className="max-w-md w-full px-4">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {storySeleccionada[0].autor?.charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-sm font-semibold">{storySeleccionada[0].autor}</p>
            </div>
            <img src={storySeleccionada[0].imagenUrl} alt="" className="w-full rounded-xl max-h-[70vh] object-contain" />
          </div>
        </div>
      )}
    </>
  );
}