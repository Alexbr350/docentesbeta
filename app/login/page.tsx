"use client";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || "";
      if (email.endsWith("@ensfa.edu.mx")) {
        router.push("/");
      } else {
        await auth.signOut();
        alert("Solo puedes ingresar con un correo @ensfa.edu.mx");
      }
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión, intenta de nuevo");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center max-w-sm w-full">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">DocentesBeta</h1>
        <p className="text-gray-500 text-sm mb-8">Plataforma para practicantes docentes</p>
        <button
          onClick={handleLogin}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition">
          Iniciar sesión con Google
        </button>
        <p className="text-xs text-gray-400 mt-4">Solo correos @ensfa.edu.mx</p>
      </div>
    </div>
  );
}