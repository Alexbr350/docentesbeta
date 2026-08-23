"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Search, MessageCircle, User, Layers } from "lucide-react";

type ResultadoPost = { id: string; tipo: string; contenido: string; autor: string };
type ResultadoPersona = { email: string; nombre: string };
type ResultadoGrupo = { id: string; nombre: string };

export default function BusquedaGlobal({ alCerrarMenu }: { alCerrarMenu?: () => void } = {}) {
  const router = useRouter();

  const [texto, setTexto] = useState("");
  const [ultimoBuscado, setUltimoBuscado] = useState("");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  const [miEmail, setMiEmail] = useState("");
  const [amigos, setAmigos] = useState<string[]>([]);
  const [universoPosts, setUniversoPosts] = useState<any[]>([]);
  const [universoPersonas, setUniversoPersonas] = useState<ResultadoPersona[]>([]);
  const [universoGrupos, setUniversoGrupos] = useState<ResultadoGrupo[]>([]);

  const [resultados, setResultados] = useState<{ posts: ResultadoPost[]; personas: ResultadoPersona[]; grupos: ResultadoGrupo[] }>({
    posts: [],
    personas: [],
    grupos: [],
  });

  const contenedorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setMiEmail(currentUser.email || "");
        cargarUniverso(currentUser.email || "");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const cargarUniverso = async (email: string) => {
    const postsSnap = await getDocs(collection(db, "posts"));
    setUniversoPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const personasMap: Record<string, string> = {};
    postsSnap.docs.forEach((d) => {
      const data: any = d.data();
      if (data.email && data.autor && data.email !== email) personasMap[data.email] = data.autor;
    });
    setUniversoPersonas(Object.entries(personasMap).map(([email, nombre]) => ({ email, nombre })));

    const gruposSnap = await getDocs(collection(db, "grupos"));
    setUniversoGrupos(gruposSnap.docs.map((d) => ({ id: d.id, nombre: (d.data() as any).nombre })));

    const amigosSnap = await getDocs(query(collection(db, "amigos"), where("usuario", "==", email)));
    setAmigos(amigosSnap.docs.map((d) => d.data().amigo));
  };

  const onChangeTexto = (valor: string) => {
    setTexto(valor);
    setMostrarDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => ejecutarBusqueda(valor), 300);
  };

  const ejecutarBusqueda = (valor: string) => {
    const q = valor.trim().toLowerCase();
    setUltimoBuscado(q);
    if (!q) {
      setResultados({ posts: [], personas: [], grupos: [] });
      return;
    }

    const posts = universoPosts
      .filter((post: any) => {
        if (post.email === miEmail) return true;
        const nivel = post.privacidad || "publico";
        if (nivel === "publico") return true;
        if (nivel === "amigos") return amigos.includes(post.email);
        if (nivel === "especifico") return (post.visiblePara || []).includes(miEmail);
        return false;
      })
      .filter((post: any) =>
        post.contenido?.toLowerCase().includes(q) ||
        post.autor?.toLowerCase().includes(q) ||
        post.tipo?.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((post: any) => ({ id: post.id, tipo: post.tipo, contenido: post.contenido, autor: post.autor }));

    const personas = universoPersonas.filter((p) => p.nombre?.toLowerCase().includes(q)).slice(0, 3);
    const grupos = universoGrupos.filter((g) => g.nombre?.toLowerCase().includes(q)).slice(0, 3);

    setResultados({ posts, personas, grupos });
  };

  const cerrarBusqueda = () => {
    setMostrarDropdown(false);
    setTexto("");
    setUltimoBuscado("");
    setResultados({ posts: [], personas: [], grupos: [] });
    alCerrarMenu?.();
  };

  const irAPost = () => {
    cerrarBusqueda();
    router.push("/");
  };

  const irAPersona = (email: string) => {
    cerrarBusqueda();
    router.push(`/usuarios?resaltar=${encodeURIComponent(email)}`);
  };

  const irAGrupo = () => {
    cerrarBusqueda();
    router.push("/grupos");
  };

  const buscandoActualmente = texto.trim().toLowerCase() !== ultimoBuscado;
  const hayResultados = resultados.posts.length > 0 || resultados.personas.length > 0 || resultados.grupos.length > 0;
  const sinResultados = !buscandoActualmente && !hayResultados && ultimoBuscado.length > 0;

  return (
    <div className="relative w-full md:w-auto" ref={contenedorRef}>
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 z-10" />
      <input
        type="text"
        placeholder="Buscar..."
        value={texto}
        onChange={(e) => onChangeTexto(e.target.value)}
        onFocus={() => { if (texto.trim()) setMostrarDropdown(true); }}
        className="bg-slate-800 text-slate-300 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 w-full md:w-40 placeholder-slate-500"
      />

      {mostrarDropdown && texto.trim() && (
        <div className="absolute top-full mt-2 left-0 right-0 md:left-auto md:right-0 w-auto md:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-30 p-4 max-h-96 overflow-y-auto">
          {buscandoActualmente && (
            <p className="text-xs text-slate-400 text-center py-4">Buscando...</p>
          )}

          {sinResultados && (
            <p className="text-xs text-slate-400 text-center py-4">Sin resultados para tu búsqueda</p>
          )}

          {!buscandoActualmente && hayResultados && (
            <>
              {resultados.posts.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <MessageCircle size={12} /> Publicaciones
                  </p>
                  {resultados.posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={irAPost}
                      className="w-full flex items-start gap-2 text-left px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <MessageCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                          {post.autor} · {post.tipo}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{post.contenido}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {resultados.personas.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <User size={12} /> Personas
                  </p>
                  {resultados.personas.map((p) => (
                    <button
                      key={p.email}
                      onClick={() => irAPersona(p.email)}
                      className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {p.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{p.nombre}</p>
                    </button>
                  ))}
                </div>
              )}

              {resultados.grupos.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Layers size={12} /> Grupos
                  </p>
                  {resultados.grupos.map((g) => (
                    <button
                      key={g.id}
                      onClick={irAGrupo}
                      className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0">
                        <Layers size={13} />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{g.nombre}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
