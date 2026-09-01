import { NextRequest, NextResponse } from "next/server";
import { obtenerAdminDb } from "../../../lib/firebaseAdmin";
import { ADMINS } from "../../../lib/admins";

// Valida el código de verificación en dos pasos generado por
// app/api/2fa/enviar/route.ts. El código es de un solo uso: se borra tanto
// si la verificación tiene éxito como si expiró.
//
// Usa el SDK de Admin de Firebase (igual que enviar/route.ts) porque esta
// ruta corre en el servidor sin la sesión de Firebase Auth del navegador —
// con el SDK de cliente, las reglas de Firestore rechazarían la lectura.

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const codigo = typeof body?.codigo === "string" ? body.codigo.trim() : "";

  if (!email || !ADMINS.includes(email) || !codigo) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  let ref;
  let snap;
  try {
    const adminDb = obtenerAdminDb();
    ref = adminDb.collection("codigos2fa").doc(email);
    snap = await ref.get();
  } catch (error) {
    console.error("Error leyendo el código 2FA de Firestore:", error);
    return NextResponse.json(
      { error: "No se pudo verificar el código. Revisa la configuración de Firebase Admin en .env.local." },
      { status: 500 }
    );
  }

  if (!snap.exists) {
    return NextResponse.json({ error: "No hay un código pendiente para este correo. Solicita uno nuevo." }, { status: 400 });
  }

  const data = snap.data() as { codigo?: string; expiraEn?: number } | undefined;

  if (!data || typeof data.expiraEn !== "number" || Date.now() > data.expiraEn) {
    await ref.delete();
    return NextResponse.json({ error: "El código expiró. Solicita uno nuevo." }, { status: 400 });
  }

  if (codigo !== data.codigo) {
    return NextResponse.json({ error: "Código incorrecto." }, { status: 400 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
