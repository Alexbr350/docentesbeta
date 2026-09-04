// Cliente ligero para el Asistente de IA de ENSFA+ (app/api/ia/route.ts).
// Se usa desde ModalMejorarIA.tsx (escenario "mejorar" en el compositor del
// feed), ModalSugerenciaIA.tsx (escenario "retroalimentacion" en Admin y
// Maestro, y también "respuesta_comunidad" en Comunidad),
// ModalSugerenciaPlaneacion.tsx (escenario "planeacion" en el compositor
// del feed), ModalCalificacionIA.tsx (escenario "calificacion" en Admin y
// Maestro) y DeteccionAtencion en app/admin/page.tsx (escenario
// "deteccion_atencion") para no duplicar el fetch + manejo de errores.

export type TareaIA = "mejorar" | "retroalimentacion" | "planeacion" | "respuesta_comunidad" | "calificacion" | "deteccion_atencion";

export async function llamarAsistenteIA(tarea: TareaIA, texto: string, tipo?: string): Promise<string> {
  let respuesta: Response;
  try {
    respuesta = await fetch("/api/ia", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tarea, texto, tipo }),
    });
  } catch {
    throw new Error("No se pudo conectar con el asistente de IA. Revisa tu conexión.");
  }

  const data = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !data?.resultado) {
    throw new Error(data?.error || "El asistente de IA no pudo generar una respuesta en este momento.");
  }

  return data.resultado as string;
}
