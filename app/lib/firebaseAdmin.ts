import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Firebase Admin SDK — SOLO para código que corre en el servidor (API
// routes). A diferencia del SDK de cliente (app/firebase.ts, usado en
// componentes "use client" y en el resto de la app), este SE SALTA las
// reglas de seguridad de Firestore por diseño: se autentica con una cuenta
// de servicio, no con la sesión del navegador. Por eso nunca debe
// importarse desde un componente de cliente, solo desde app/api/**/route.ts.
//
// Se usa aquí porque las reglas de Firestore del proyecto son
// `allow read, write: if request.auth != null`, y una API route no tiene la
// sesión de Firebase Auth del navegador — con el SDK de cliente, el
// request.auth de las reglas llega vacío y la escritura se rechaza con
// PERMISSION_DENIED. El SDK de Admin evita ese problema por completo.

let appAdmin: App | null = null;

function obtenerAppAdmin(): App {
  if (appAdmin) return appAdmin;

  const existentes = getApps();
  if (existentes.length > 0) {
    appAdmin = existentes[0];
    return appAdmin;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // La clave privada viene de un JSON descargado de Firebase y trae saltos
  // de línea escapados como "\n" literales; hay que convertirlos a saltos
  // de línea reales para que el SDK pueda parsear la clave.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno de Firebase Admin: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL y/o FIREBASE_ADMIN_PRIVATE_KEY. Revisa .env.local."
    );
  }

  appAdmin = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return appAdmin;
}

/** Instancia de Firestore autenticada con la cuenta de servicio (sin reglas de seguridad). */
export function obtenerAdminDb(): Firestore {
  return getFirestore(obtenerAppAdmin());
}
