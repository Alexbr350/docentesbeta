import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Asistente de IA de ENSFA+. Llama a la API de Google Gemini (capa gratuita)
// desde el servidor — la API key nunca se expone al cliente. Dos tareas
// soportadas:
//  - "mejorar": mejora la redacción de un texto que el practicante ya escribió.
//  - "retroalimentacion": genera un borrador de comentario para el evaluador.

// gemini-3.5-flash-lite: modelo rápido y económico, pensado para uso a gran
// escala dentro de la capa gratuita de la API de Gemini.
const MODELO_GEMINI = "gemini-3.5-flash-lite";

const PROMPT_MEJORAR = (tipo: string) => `Eres un asistente de escritura para practicantes docentes de la Escuela Normal Superior Federal de Aguascalientes (ENSFA). Tu única tarea es mejorar la claridad, ortografía y redacción del texto que te dan, que es una publicación de tipo "${tipo}" en su portafolio digital.

Reglas estrictas:
- NO inventes contenido nuevo, ejemplos, datos ni experiencias que no estén ya en el texto original.
- NO cambies el sentido, las opiniones ni las conclusiones del autor.
- Solo mejora claridad, gramática, ortografía y fluidez de la redacción.
- Mantén el mismo idioma (español) y un tono similar al original.
- Responde ÚNICAMENTE con el texto mejorado. Sin explicaciones, sin comillas, sin encabezados, sin comentarios adicionales.`;

const PROMPT_RETROALIMENTACION = (tipo: string) => `Eres un maestro normalista mexicano con experiencia, evaluando a un practicante docente de la Escuela Normal Superior Federal de Aguascalientes (ENSFA). Vas a leer una publicación de tipo "${tipo}" escrita por el practicante y debes redactar un borrador de retroalimentación para él.

Reglas:
- El comentario debe ser breve (2 a 4 oraciones), constructivo, específico y cálido, como lo daría un maestro normalista mexicano con experiencia.
- Reconoce algo positivo y concreto del texto, y sugiere al menos un punto de mejora o algo a reforzar.
- Basa el comentario únicamente en lo que dice el texto; no inventes datos ni situaciones que no estén ahí.
- Este es solo un BORRADOR: el maestro lo revisará y editará antes de enviarlo, así que redáctalo en primera persona como si el maestro lo estuviera escribiendo.
- Responde ÚNICAMENTE con el comentario. Sin encabezados, sin comillas, sin explicaciones adicionales.`;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { tarea, texto, tipo } = body || {};

  if (typeof texto !== "string" || !texto.trim()) {
    return NextResponse.json({ error: "Falta el texto a procesar." }, { status: 400 });
  }
  if (tarea !== "mejorar" && tarea !== "retroalimentacion") {
    return NextResponse.json({ error: "Tarea no válida." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Falta la variable de entorno GEMINI_API_KEY.");
    return NextResponse.json(
      { error: "El asistente de IA no está configurado todavía. Agrega tu clave en .env.local." },
      { status: 500 }
    );
  }

  const tipoTexto = typeof tipo === "string" && tipo.trim() ? tipo : "práctica docente";
  const systemPrompt = tarea === "mejorar" ? PROMPT_MEJORAR(tipoTexto) : PROMPT_RETROALIMENTACION(tipoTexto);

  try {
    const ai = new GoogleGenAI({ apiKey });

    const respuestaGemini = await ai.models.generateContent({
      model: MODELO_GEMINI,
      contents: texto,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
      },
    });

    const resultado: string | undefined = respuestaGemini?.text?.trim();

    if (!resultado) {
      return NextResponse.json({ error: "El asistente de IA no devolvió una respuesta válida." }, { status: 502 });
    }

    return NextResponse.json({ resultado });
  } catch (error) {
    console.error("Error llamando a la API de Gemini:", error);
    return NextResponse.json(
      { error: "El asistente de IA no pudo generar una respuesta en este momento. Intenta de nuevo en un momento." },
      { status: 502 }
    );
  }
}
