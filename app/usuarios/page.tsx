"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import Navbar from "../components/Navbar";
import { collection, getDocs, addDoc, serverTimestamp, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { UserPlus, Users2, Check, X } from "lucide-react";
import { useToast } from "../components/Toast";
import AmigosSugeridos from "../components/AmigosSugeridos";
import Spinner from "../components/Spinner";

export default function Usuarios() {
  const { mostrarToast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [amigos, setAmigos] = useState<string[]>([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const refResaltado = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/landing");
      } else {
        setUser(currentUser);
        cargarTodo(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("resaltar");
    if (email) setResaltado(email);
  }, []);

  useEffect(() => {
    if (resaltado && !loading && refResaltado.current) {
      refResaltado.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [resaltado, loading]);

  const cargarTodo = async (currentUser: any) => {
    const postsSnap = await getDocs(collection(db, "posts"));
    const emails = [...new Set(postsSnap.docs.map((d) => d.data().email))];
    const data = emails
      .filter((email) => email !== currentUser.email)
      .map((email) => ({
        email,
        nombre: postsSnap.docs.find((d) => d.data().email === email)?.data().autor,
        publicaciones: postsSnap.docs.filter((d) => d.data().email === email).length,
      }));
    setUsuarios(data);

    const solSnap = await getDocs(query(collection(db, "solicitudes"), where("para", "==", currentUser.email)));
    setSolicitudes(solSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const amigosSnap = await getDocs(query(collection(db, "amigos"), where("usuario", "==", currentUser.email)));
    setAmigos(amigosSnap.docs.map((d) => d.data().amigo));

    const enviadasSnap = await getDocs(query(collection(db, "solicitudes"), where("de", "==", currentUser.email)));
    const enviadasMap: Record<string, string[]> = {};
    enviadasSnap.docs.forEach((d) => {
      const solData: any = d.data();
      if (solData.estado === "pendiente") {
        if (!enviadasMap[solData.para]) enviadasMap[solData.para] = [];
        enviadasMap[solData.para].push(d.id);
      }
    });
    setSolicitudesEnviadas(enviadasMap);

    setLoading(false);
  };

  const enviarSolicitud = async (paraEmail: string) => {
    const ref = await addDoc(collection(db, "solicitudes"), {
      de: user.email,
      deNombre: user.displayName || user.email,
      para: paraEmail,
      estado: "pendiente",
      fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: paraEmail,
      de: user.displayName || user.email,
      mensaje: "te envió una solicitud de amistad",
      leida: false,
      fecha: serverTimestamp(),
    });
    setSolicitudesEnviadas((prev) => ({ ...prev, [paraEmail]: [...(prev[paraEmail] || []), ref.id] }));
    mostrarToast("Solicitud enviada!");
  };

  const cancelarSolicitudEnviada = async (paraEmail: string) => {
    const ids = solicitudesEnviadas[paraEmail];
    if (!ids || ids.length === 0) return;
    try {
      // Se borran TODAS las solicitudes pendientes hacia esa persona (por si quedaron duplicadas de antes)
      await Promise.all(ids.map((id) => deleteDoc(doc(db, "solicitudes", id))));
      setSolicitudesEnviadas((prev) => {
        const nuevo = { ...prev };
        delete nuevo[paraEmail];
        return nuevo;
      });
      mostrarToast("Solicitud cancelada");
    } catch (error) {
      mostrarToast("No se pudo cancelar la solicitud. Intenta de nuevo.", "error");
    }
  };

  const rechazarSolicitud = async (solicitudId: string) => {
    await deleteDoc(doc(db, "solicitudes", solicitudId));
    setSolicitudes(solicitudes.filter((s) => s.id !== solicitudId));
  };

  const aceptarSolicitud = async (solicitud: any) => {
    await updateDoc(doc(db, "solicitudes", solicitud.id), { estado: "aceptada" });
    await addDoc(collection(db, "amigos"), { usuario: user.email, amigo: solicitud.de, fecha: serverTimestamp() });
    await addDoc(collection(db, "amigos"), { usuario: solicitud.de, amigo: user.email, fecha: serverTimestamp() });
    await addDoc(collection(db, "notificaciones"), {
      para: solicitud.de,
      de: user.displayName || user.email,
      mensaje: "aceptó tu solicitud de amistad",
      leida: false,
      fecha: serverTimestamp(),
    });
    setSolicitudes(solicitudes.filter((s) => s.id !== solicitud.id));
    setAmigos([...amigos, solicitud.de]);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <img src="/logo.png" alt="ENSFA" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-80" />
        <Spinner texto="Cargando usuarios..." />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors animate-fade-in">
      <Navbar paginaActual="Usuarios" />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {solicitudes.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-6 shadow-md">
            <h2 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5"><UserPlus size={16} className="text-emerald-500" /> Solicitudes de amistad</h2>
            {solicitudes.map((sol) => (
              <div key={sol.id} className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0">
                    {sol.deNombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{sol.deNombre}</p>
                    <p className="text-xs text-slate-400">{sol.de}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => aceptarSolicitud(sol)}
                    className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95"
                  >
                    <Check size={13} /> Aceptar
                  </button>
                  <button
                    onClick={() => rechazarSolicitud(sol.id)}
                    className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-xl font-semibold transition active:scale-95"
                  >
                    <X size={13} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AmigosSugeridos />

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-1.5"><Users2 size={16} className="text-purple-500" /> Practicantes en ENSFA+</h2>
          {usuarios.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No hay otros practicantes todavía.</p>
          )}
          {usuarios.map((u) => (
            <div
              key={u.email}
              ref={u.email === resaltado ? refResaltado : undefined}
              className={`flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${u.email === resaltado ? "bg-blue-50 dark:bg-blue-950/40 -mx-3 px-3 rounded-xl" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow flex-shrink-0">
                  {u.nombre?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{u.nombre}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                  <p className="text-xs text-blue-500">{u.publicaciones} publicaciones</p>
                </div>
              </div>
              <div className="flex flex-wrap">
                {amigos.includes(u.email) ? (
                  <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 px-3 py-2 rounded-xl font-semibold"><Check size={13} /> Amigos</span>
                ) : (solicitudesEnviadas[u.email]?.length ?? 0) > 0 ? (
                  <button
                    onClick={() => cancelarSolicitudEnviada(u.email)}
                    className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 dark:text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl font-semibold transition active:scale-95"
                  >
                    <X size={13} /> Cancelar solicitud
                  </button>
                ) : (
                  <button
                    onClick={() => enviarSolicitud(u.email)}
                    className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold shadow transition active:scale-95"
                  >
                    <UserPlus size={13} /> Agregar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}