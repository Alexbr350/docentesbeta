"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import ChatBubble from "./ChatBubble";

export default function Navbar({ paginaActual }: { paginaActual: string }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<any[]>([]);
  const emailRef = useRef<string>("");

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        emailRef.current = currentUser.email || "";
        cargarNotificaciones(currentUser.email || "");
      }
    });
    const intervalo = setInterval(() => {
      if (emailRef.current) cargarNotificaciones(emailRef.current);
    }, 15000);
    return () => { unsubscribe(); clearInterval(intervalo); };
  }, []);

  const cargarNotificaciones = async (email: string) => {
    const q = query(collection(db, "notificaciones"), where("para", "==", email), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const nuevas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const noLeidasAntes = notifRef.current.filter((n: any) => !n.leida).length;
    const noLeidasAhora = nuevas.filter((n: any) => !n.leida).length;
    if (noLeidasAhora > noLeidasAntes && typeof Notification !== "undefined" && Notification.permission === "granted") {
      const ultimaNoLeida: any = nuevas.find((n: any) => !n.leida);
      if (ultimaNoLeida) {
        new Notification("ENSFA+", {
          body: `${ultimaNoLeida.de}: ${ultimaNoLeida.mensaje}`,
          icon: "/logo.png",
        });
      }
    }

    notifRef.current = nuevas;
    setNotificaciones(nuevas);
  };

  const marcarLeidas = async () => {
    const noLeidas = notificaciones.filter((n) => !n.leida);
    for (const n of noLeidas) {
      await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
    }
    const actualizadas = notificaciones.map((n) => ({ ...n, leida: true }));
    notifRef.current = actualizadas;
    setNotificaciones(actualizadas);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/landing");
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <>
      <nav className="bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-xs text-slate-400 leading-none">ENSFA</p>
            <h1 className="text-sm font-bold text-white leading-tight">ENSFA<span className="text-blue-400">+</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Buscar..."
            className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 w-40 placeholder-slate-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const valor = (e.target as HTMLInputElement).value;
                if (valor.trim()) router.push(`/?buscar=${encodeURIComponent(valor)}`);
              }
            }}
          />
          {["Feed", "Portafolio", "Comunidad", "Perfil", "Usuarios", "Grupos", "Maestro"].map((item) => (
            <button
              key={item}
              onClick={() => item === "Feed" ? router.push("/") : router.push(`/${item.toLowerCase()}`)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${item === paginaActual ? "text-white bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) marcarLeidas(); }}
            className="relative text-lg px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            🔔
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {noLeidas}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
            Salir
          </button>
        </div>
      </nav>

      {showNotif && (
        <div className="fixed top-14 right-4 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-20 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">🔔 Notificaciones</h3>
          {notificaciones.length === 0 && <p className="text-xs text-gray-400">No tienes notificaciones.</p>}
          {notificaciones.map((n) => (
            <div key={n.id} className={`mb-2 p-3 rounded-xl text-xs ${n.leida ? "bg-slate-50" : "bg-blue-50 border border-blue-100"}`}>
              <span className="font-bold text-gray-800">{n.de}</span>
              <span className="text-gray-600"> {n.mensaje}</span>
            </div>
          ))}
        </div>
      )}

      <ChatBubble />
    </>
  );
}