"use client";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "../components/Toast";
import SplashScreen from "../components/SplashScreen";
import Verificacion2FA from "../components/Verificacion2FA";
import { ADMINS } from "../lib/admins";

export default function LoginPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [mostrarSplash, setMostrarSplash] = useState(false);
  const [mostrar2FA, setMostrar2FA] = useState(false);
  const [email2FA, setEmail2FA] = useState("");

  useEffect(() => {
    const guardado = localStorage.getItem("modoOscuro") === "true";
    if (guardado) document.documentElement.classList.add("dark");
  }, []);

  // Por si el navegador bloqueó el popup y tuvimos que caer a signInWithRedirect:
  // al volver de Google, Firebase entrega el resultado aquí.
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          procesarUsuario(result.user.email || "");
        }
      })
      .catch((error) => {
        console.error(error);
        mostrarToast("Error al iniciar sesión, intenta de nuevo", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const procesarUsuario = async (email: string) => {
    if (email.endsWith("@ensfa.edu.mx")) {
      // Verificación en dos pasos exclusiva para administradores: se pide una
      // sola vez por sesión del navegador (sessionStorage), no en cada login
      // si ya se verificó antes en esta misma pestaña/sesión.
      //
      // Interruptor temporal: NEXT_PUBLIC_TFA_ACTIVO=true la activa. Si no
      // está presente o vale cualquier otra cosa (incluido "false"), el
      // login de administradores se comporta como antes de tener 2FA — sin
      // tocar Verificacion2FA.tsx ni las API routes de app/api/2fa/, que
      // quedan intactas para reactivarlo solo cambiando esta variable.
      const tfaActivo = process.env.NEXT_PUBLIC_TFA_ACTIVO === "true";
      if (tfaActivo && ADMINS.includes(email) && sessionStorage.getItem(`2fa_ok_${email}`) !== "true") {
        setEmail2FA(email);
        setMostrar2FA(true);
        return;
      }
      setMostrarSplash(true);
    } else {
      await auth.signOut();
      mostrarToast("Solo puedes ingresar con un correo @ensfa.edu.mx", "error");
    }
  };

  const handleVerificado2FA = () => {
    setMostrar2FA(false);
    setMostrarSplash(true);
  };

  const handleCancelar2FA = async () => {
    setMostrar2FA(false);
    setEmail2FA("");
    await auth.signOut();
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await procesarUsuario(result.user.email || "");
    } catch (error: any) {
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        // El usuario cerró la ventana, no es un error real
        return;
      }
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/operation-not-supported-in-this-environment") {
        // El navegador bloqueó el popup: caemos a signInWithRedirect (redirige la página completa a Google y regresa)
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error(redirectError);
          mostrarToast("Error al iniciar sesión, intenta de nuevo", "error");
        }
        return;
      }
      console.error(error);
      mostrarToast("Error al iniciar sesión, intenta de nuevo", "error");
    }
  };

  const finalizarSplash = () => {
    sessionStorage.setItem("splashMostrado", "true");
    router.push("/");
  };

  if (mostrar2FA) {
    return (
      <Verificacion2FA
        visible={mostrar2FA}
        email={email2FA}
        onVerificado={handleVerificado2FA}
        onCancelar={handleCancelar2FA}
      />
    );
  }

  if (mostrarSplash) {
    return <SplashScreen onFinish={finalizarSplash} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-950 dark:to-slate-900 transition-colors animate-fade-in">
      <div className="w-full max-w-md px-8">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg">
            <img src="/logo.png" alt="ENSFA" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">ENSFA+</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm">Plataforma para practicantes docentes</p>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Escuela Normal Superior de...</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">Iniciar sesión</h2>
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Usa tu correo institucional <span className="text-blue-500 dark:text-blue-400 font-medium">@ensfa.edu.mx</span></p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-6 rounded-2xl transition shadow-md hover:shadow-lg active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            Continuar con Google
          </button>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500">Solo usuarios con correo <span className="font-medium">@ensfa.edu.mx</span> pueden acceder</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">DocentesBeta v1.0 — Beta</p>
      </div>
    </div>
  );
}