import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import { obtenerAdminDb } from "../../../lib/firebaseAdmin";
import { ADMINS } from "../../../lib/admins";

// Genera y envía el código de verificación en dos pasos (2FA) que se pide a
// los administradores al iniciar sesión. Solo emails en ADMINS pueden pedir
// un código — cualquier otro correo se rechaza aquí mismo, sin generar nada.
//
// El código se guarda en Firestore (colección `codigos2fa`, un documento por
// email) con una expiración de 5 minutos, y se envía por correo con Resend
// (capa gratuita: resend.com). Ver la variable de entorno RESEND_API_KEY.
//
// Usa el SDK de Admin de Firebase (app/lib/firebaseAdmin.ts) para escribir,
// no el SDK de cliente: esta ruta corre en el servidor, sin la sesión de
// Firebase Auth del navegador, así que las reglas de Firestore
// (`allow write: if request.auth != null`) rechazarían la escritura si se
// hiciera con el SDK de cliente.

const DURACION_CODIGO_MS = 5 * 60 * 1000;

function generarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !ADMINS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const codigo = generarCodigo();
  const expiraEn = Date.now() + DURACION_CODIGO_MS;

  try {
    const adminDb = obtenerAdminDb();
    await adminDb.collection("codigos2fa").doc(email).set({
      codigo,
      expiraEn,
      creadoEn: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error guardando el código 2FA en Firestore:", error);
    return NextResponse.json(
      { error: "No se pudo generar el código. Revisa que FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL y FIREBASE_ADMIN_PRIVATE_KEY estén en .env.local." },
      { status: 500 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Falta la variable de entorno RESEND_API_KEY.");
    return NextResponse.json(
      { error: "El envío de correos no está configurado todavía. Agrega RESEND_API_KEY en .env.local." },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const remitente = process.env.RESEND_FROM_EMAIL || "ENSFA+ <onboarding@resend.dev>";
    // TEMPORAL: cambiar cuando se verifique dominio en Resend
    // Mientras no haya un dominio verificado en Resend, el remitente de
    // pruebas (onboarding@resend.dev) solo entrega a la cuenta con la que
    // te registraste ahí. Forzamos el destinatario real a esa cuenta para
    // poder probar el flujo completo — el código sigue guardándose en
    // Firestore bajo el email del admin real (`email`), así que la
    // verificación posterior no se ve afectada por este cambio.
    const destinatarioPrueba = "alexbonillarivera.1704@gmail.com";
    await resend.emails.send({
      from: remitente,
      to: destinatarioPrueba,
      subject: `Tu código de verificación: ${codigo}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; color: #1e293b;">
          <h2 style="color: #2563eb; margin-bottom: 4px;">ENSFA+</h2>
          <p style="font-size: 14px; color: #475569;">Verificación en dos pasos para administradores</p>
          <p style="font-size: 12px; color: #94a3b8;">(Modo de prueba: este código es para el inicio de sesión de ${email})</p>
          <p style="font-size: 14px; margin-top: 24px;">Tu código de verificación es:</p>
          <p style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1e293b; margin: 12px 0;">${codigo}</p>
          <p style="font-size: 13px; color: #64748b;">Este código expira en 5 minutos. Si tú no intentaste iniciar sesión en ENSFA+, ignora este correo.</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error enviando el código 2FA por correo:", error);
    return NextResponse.json({ error: "No se pudo enviar el correo con el código. Intenta de nuevo." }, { status: 502 });
  }
}
