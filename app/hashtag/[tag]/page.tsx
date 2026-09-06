"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Hash } from "lucide-react";
import Navbar from "../../components/Navbar";
import Spinner from "../../components/Spinner";
import ContenidoConHashtags from "../../components/ContenidoConHashtags";
import PuntoEnLinea from "../../components/PuntoEnLinea";

const COLORES_TIPO: Record<string, string> = {
  "Diario": "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  "Planeación": "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  "Narrativa": "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  "Extra": "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
  "Pedir ayuda": "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  "Actividad": "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  "Compartido": "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400",
};

// Explora todas las publicaciones que usan un hashtag específico, respetando
// las mismas reglas de privacidad que el feed (público/amigos/específico/
// privado) — ver la misma lógica en postsFiltrados de app/page.tsx.
export default function HashtagPage() {
  const router = useRouter();
  const params = useParams<{ tag: string }>();
  const tag = (Array.isArray(params?.tag) ? params.tag[0] : params?.tag || "").toLowerCase();

  const [user, setUser] = useState<any>(null);
  const [amigos, setAmigos] = useState<string[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) { router.push("/landing"); return; }
      setUser(currentUser);
      cargarDatos(currentUser);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  const cargarDatos = async (currentUser: any) => {
    // Sin orderBy combinado con el array-contains a propósito: evita
    // necesitar un índice compuesto en Firestore. El orden por fecha se hace
    // en el cliente, igual que con otras listas de esta app.
    const [amigosSnap, postsSnap] = await Promise.all([
      getDocs(query(collection(db, "amigos"), where("usuario", "==", currentUser.email))),
      getDocs(query(collection(db, "posts"), where("hashtags", "array-contains", tag))),
    ]);
    setAmigos(amigosSnap.docs.map((d) => d.data().amigo));
    const data = postsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));
    setPosts(data);
    setCargando(false);
  };

  const postsVisibles = posts.filter((post) => {
    if (post.email === user?.email) return true;
    const nivel = post.privacidad || "publico";
    if (nivel === "publico") return true;
    if (nivel === "amigos") return amigos.includes(post.email);
    if (nivel === "especifico") return (post.visiblePara || []).includes(user?.email);
    if (nivel === "privado") return false;
    return true;
  });

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner texto="Cargando publicaciones..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Feed" />

      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Hash size={24} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">#{tag}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {postsVisibles.length} publicaci{postsVisibles.length === 1 ? "ón" : "ones"}
            </p>
          </div>
        </div>

        {postsVisibles.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-md">
            Aún no hay publicaciones con #{tag}.
          </div>
        )}

        {postsVisibles.map((post) => (
          <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-3 shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                  {post.autor?.charAt(0).toUpperCase()}
                </div>
                <PuntoEnLinea email={post.email} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{post.autor}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${COLORES_TIPO[post.tipo] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                  {post.tipo}
                </span>
                {post.fecha && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {post.fecha?.toDate?.()?.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
            <ContenidoConHashtags texto={post.contenido} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" />
          </div>
        ))}
      </div>
    </div>
  );
}
