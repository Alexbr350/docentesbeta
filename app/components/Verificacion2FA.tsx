"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound } from "lucide-react";
import Spinner from "./Spinner";

// Pantalla intermedia de verificación en dos pasos (2FA) para administradores
// — se muestra después de un login con Google exitoso, antes de dejar entrar
// al feed. Envía el código automáticamente al montarse y permite reenviarlo
// (con un pequeño enfriamiento) si no llega.

const SEGUNDOS_ENFRIAMIENTO = 30;

export default function Verificacion2FA({
  visible,
  email,
  onVerificado,
  onCancelar,
}: {
  visible: boolean;
  email: string;
  onVerificado: () => void;
  onCancelar: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (visible && email) {
      setCodigo("");
      setError("");
      setEnviado(false);
      enviarCodigo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!visible) return null;

  const enviarCodigo = async () => {
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el código.");
      } else {
        setEnviado(true);
        setCooldown(SEGUNDOS_ENFRIAMIENTO);
      }
    } catch {
      setError("No se pudo enviar el código. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async () => {
    if (codigo.length !== 6 || verificando) return;
    setVerificando(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Código incorrecto.");
        setVerificando(false);
        return;
      }
      sessionStorage.setItem(`2fa_ok_${email}`, "true");
      onVerificado();
    } catch {
      setError("No se pudo verificar el código. Intenta de nuevo.");
      setVerificando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-modal-pop">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={26} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-800 dark:text-slate-100">Verificación en dos pasos</h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Por seguridad, tu cuenta de administrador requiere un código. Lo enviamos a{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300">{email}</span>
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && verificar()}
          placeholder="------"
          autoFocus
          className="w-full text-center text-3xl font-extrabold tracking-[0.5em] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-3 text-slate-800 dark:text-slate-100 mt-6 focus:outline-none focus:border-blue-400"
        />

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        {enviado && !error && <p className="text-xs text-emerald-500 mt-3">Código enviado. Revisa tu bandeja de entrada.</p>}

        <button
          onClick={verificar}
          disabled={codigo.length !== 6 || verificando}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-2xl mt-5 disabled:opacity-50 transition active:scale-95"
        >
          {verificando ? (
            <>
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Verificando...
            </>
          ) : (
            <>
              <KeyRound size={16} /> Verificar código
            </>
          )}
        </button>

        <button
          onClick={enviarCodigo}
          disabled={cooldown > 0 || enviando}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-4 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:no-underline font-semibold block mx-auto"
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : enviando ? <Spinner tamano={11} texto="Enviando..." /> : "Reenviar código"}
        </button>

        <button onClick={onCancelar} className="block mx-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-4">
          Cancelar e iniciar sesión con otra cuenta
        </button>
      </div>
    </div>
  );
}
