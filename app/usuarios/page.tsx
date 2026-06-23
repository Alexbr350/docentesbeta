"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, addDoc, serverTimestamp, query, where, updateDoc, doc } from "firebase/firestore";

export default function Usuarios() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [amigos, setAmigos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  const cargarTodo = async (currentUser: any) => {
    // Cargar usuarios únicos de posts
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

    // Cargar solicitudes
    const solSnap = await getDocs(query(collection(db, "solicitudes"), where("para", "==", currentUser.email)));
    setSolicitudes(solSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    // Cargar amigos
    const amigosSnap = await getDocs(query(collection(db, "amigos"), where("usuario", "==", currentUser.email)));
    setAmigos(amigosSnap.docs.map((d) => d.data().amigo));

    setLoading(false);
  };

  const enviarSolicitud = async (paraEmail: string) => {
    await addDoc(collection(db, "solicitudes"), {
      de: user.email,
      deNombre: user.displayName || user.email,
      para: paraEmail,
      estado: "pendiente",
      fecha: serverTimestamp(),
    });
    await addDoc(collection(db, "notificaciones"), {
      para: paraEmail,
      de: user.displayName || user.email,
      mensaje: "te envió una solicitud de amistad 🤝",
      leida: false,
      fecha: serverTimestamp(),
    });
    alert("¡Solicitud enviada!");
  };

  const aceptarSolicitud = async (solicitud: any) => {
    await updateDoc(doc(db, "solicitudes", solicitud.id), { estado: "aceptada" });
    await addDoc(collection(db, "amigos"), { usuario: user.email, amigo: solicitud.de, fecha: serverTimestamp() });
    await addDoc(collection(db, "amigos"), { usuario: solicitud.de, amigo: user.email, fecha: serverTimestamp() });
    await addDoc(collection(db, "notificaciones"), {
      para: solicitud.de,
      de: user.displayName || user.email,
      mensaje: "aceptó tu solicitud de amistad 🎉",
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
        <p className="text-slate-400 text-sm">Cargando usuarios...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA</p>
            <h1 className="text-sm font-bold text-white leading-tight">Docentes<span className="text-blue-400">Beta</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["Feed", "Portafolio", "Comunidad", "Perfil", "Usuarios"].map((item) => (
            <button
              key={item}
              onClick={() => item === "Feed" ? router.push("/") : router.push(`/${item.toLowerCase()}`)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${item === "Usuarios" ? "text-white bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              {item}
            </button>
          ))}
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Solicitudes pendientes */}
        {solicitudes.length > 0 && (
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-md">
            <h2 className="text-sm font-extrabold text-gray-800 mb-4">🤝 Solicitudes de amistad</h2>
            {solicitudes.map((sol) => (
              <div key={sol.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold">
                    {sol.deNombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{sol.deNombre}</p>
                    <p className="text-xs text-slate-400">{sol.de}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => aceptarSolicitud(sol)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-semibold"
                  >
                    Aceptar
                  </button>
                  <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl font-semibold">
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de usuarios */}
        <div className="bg-white rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-extrabold text-gray-800 mb-4">👥 Practicantes en DocentesBeta</h2>
          {usuarios.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No hay otros practicantes todavía.</p>
          )}
          {usuarios.map((u) => (
            <div key={u.email} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold shadow">
                  {u.nombre?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{u.nombre}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                  <p className="text-xs text-blue-500">{u.publicaciones} publicaciones</p>
                </div>
              </div>
              <div>
                {amigos.includes(u.email) ? (
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-xl font-semibold">✓ Amigos</span>
                ) : (
                  <button
                    onClick={() => enviarSolicitud(u.email)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-semibold shadow"
                  >
                    + Agregar
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