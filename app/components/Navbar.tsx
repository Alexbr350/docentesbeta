"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import ChatBubble from "./ChatBubble";
import BusquedaGlobal from "./BusquedaGlobal";
import { Home, FolderOpen, Users2, Calendar, CalendarDays, User, UserPlus, LayersIcon, GraduationCap, Bell, LogOut, Sun, Moon, Menu, X, Shield, ShieldCheck } from "lucide-react";
import { ADMINS } from "../lib/admins";

export default function Navbar({ paginaActual }: { paginaActual: string }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [campanaVibrando, setCampanaVibrando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [esMaestro, setEsMaestro] = useState(false);
  const notifRef = useRef<any[]>([]);
  const emailRef = useRef<string>("");
  const primeraCargaRef = useRef(true);

  useEffect(() => {
    const guardado = localStorage.getItem("modoOscuro") === "true";
    setModoOscuro(guardado);
    if (guardado) document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        emailRef.current = currentUser.email || "";
        cargarNotificaciones(currentUser.email || "");
        verificarMaestro(currentUser.email || "");
      }
    });
    const intervalo = setInterval(() => {
      if (emailRef.current) cargarNotificaciones(emailRef.current);
    }, 15000);
    return () => { unsubscribe(); clearInterval(intervalo); };
  }, []);

  const verificarMaestro = async (email: string) => {
    const snap = await getDocs(query(collection(db, "maestros"), where("email", "==", email)));
    setEsMaestro(!snap.empty);
  };

  const cargarNotificaciones = async (email: string) => {
    const q = query(collection(db, "notificaciones"), where("para", "==", email), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const nuevas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const noLeidasAntes = notifRef.current.filter((n: any) => !n.leida).length;
    const noLeidasAhora = nuevas.filter((n: any) => !n.leida).length;

    if (!primeraCargaRef.current && noLeidasAhora > noLeidasAntes) {
      setCampanaVibrando(true);
      setTimeout(() => setCampanaVibrando(false), 500);
    }
    primeraCargaRef.current = false;

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

  const toggleTema = () => {
    const nuevo = !modoOscuro;
    setModoOscuro(nuevo);
    localStorage.setItem("modoOscuro", String(nuevo));
    document.documentElement.classList.toggle("dark", nuevo);
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const esAdmin = !!user && ADMINS.includes(user.email || "");

  const NAV_ITEMS = [
    { label: "Feed", icon: Home, color: "text-blue-400" },
    { label: "Portafolio", icon: FolderOpen, color: "text-amber-400" },
    { label: "Comunidad", icon: Users2, color: "text-fuchsia-400" },
    { label: "Eventos", icon: Calendar, color: "text-pink-400" },
    { label: "Calendario", icon: CalendarDays, color: "text-blue-400" },
    { label: "Perfil", icon: User, color: "text-cyan-400" },
    { label: "Usuarios", icon: UserPlus, color: "text-emerald-400" },
    { label: "Grupos", icon: LayersIcon, color: "text-orange-400" },
    { label: "Maestro", icon: GraduationCap, color: "text-red-400" },
    ...(esAdmin ? [{ label: "Admin", icon: Shield, color: "text-purple-400" }] : []),
  ];

  const irA = (label: string) => {
    router.push(label === "Feed" ? "/" : `/${label.toLowerCase()}`);
    setMenuAbierto(false);
  };

  return (
    <>
      <nav className="bg-slate-900 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <img src="/logo.png" alt="ENSFA" className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none">ENSFA</p>
            <h1 className="text-sm font-bold text-white leading-tight">ENSFA<span className="text-blue-400">+</span></h1>
          </div>
          {esAdmin && (
            <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 pl-1.5 pr-1.5 sm:pr-2 py-0.5 rounded-full">
              <ShieldCheck size={11} />
              <span className="hidden sm:inline uppercase tracking-wide">Admin</span>
            </span>
          )}
          {esMaestro && (
            <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 pl-1.5 pr-1.5 sm:pr-2 py-0.5 rounded-full">
              <GraduationCap size={11} />
              <span className="hidden sm:inline uppercase tracking-wide">Maestro</span>
            </span>
          )}
        </div>

        {/* Navegación de escritorio */}
        <div className="hidden md:flex items-center gap-2">
          <BusquedaGlobal />
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => irA(item.label)}
              className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition ${item.label === paginaActual ? "text-white bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <item.icon size={14} className={item.label === paginaActual ? "text-white" : item.color} />
              {item.label}
            </button>
          ))}
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) marcarLeidas(); }}
            className="relative p-2 rounded-lg hover:bg-slate-800 transition active:scale-95 text-yellow-400"
          >
            <Bell size={16} className={campanaVibrando ? "animate-wiggle" : ""} />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {noLeidas}
              </span>
            )}
          </button>
          <button
            onClick={toggleTema}
            className="p-2 rounded-lg hover:bg-slate-800 transition text-slate-300"
          >
            {modoOscuro ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
            <LogOut size={14} />
            Salir
          </button>
        </div>

        {/* Navegación móvil: campana + botón de menú */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) marcarLeidas(); }}
            className="relative p-2 rounded-lg hover:bg-slate-800 transition active:scale-95 text-yellow-400"
          >
            <Bell size={18} className={campanaVibrando ? "animate-wiggle" : ""} />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {noLeidas}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuAbierto(true)}
            className="p-2 rounded-lg hover:bg-slate-800 transition active:scale-95 text-slate-200"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Drawer lateral móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMenuAbierto(false)} />
          <div className="absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-slate-900 shadow-2xl flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">Menú</h2>
              <button onClick={() => setMenuAbierto(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 active:scale-95 transition" aria-label="Cerrar menú">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <BusquedaGlobal alCerrarMenu={() => setMenuAbierto(false)} />
            </div>

            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => irA(item.label)}
                  className={`flex items-center gap-3 text-sm font-medium px-3 py-3 rounded-lg transition ${item.label === paginaActual ? "text-white bg-slate-700" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}
                >
                  <item.icon size={18} className={item.label === paginaActual ? "text-white" : item.color} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={toggleTema}
                className="flex items-center gap-3 text-sm font-medium px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                {modoOscuro ? <Sun size={18} /> : <Moon size={18} />}
                {modoOscuro ? "Modo claro" : "Modo oscuro"}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 font-medium px-3 py-3 rounded-lg hover:bg-slate-800 transition"
              >
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotif && (
        <div className="fixed top-14 right-2 md:right-4 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-20 p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-1"><Bell size={16} className="text-yellow-500" /> Notificaciones</h3>
          {notificaciones.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500">No tienes notificaciones.</p>}
          {notificaciones.map((n) => (
            <div key={n.id} className={`mb-2 p-3 rounded-xl text-xs ${n.leida ? "bg-slate-50 dark:bg-slate-800" : "bg-blue-50 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/40"}`}>
              <span className="font-bold text-gray-800 dark:text-slate-100">{n.de}</span>
              <span className="text-gray-600 dark:text-slate-400"> {n.mensaje}</span>
            </div>
          ))}
        </div>
      )}

      <ChatBubble />
    </>
  );
}