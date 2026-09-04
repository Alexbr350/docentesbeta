import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Asistente de IA de ENSFA+. Llama a la API de Google Gemini (capa gratuita)
// desde el servidor — la API key nunca se expone al cliente. Tareas
// soportadas:
//  - "mejorar": mejora la redacción de un texto que el practicante ya escribió.
//  - "retroalimentacion": genera un borrador de comentario para el evaluador.
//  - "planeacion": sugiere estructura/actividades para una planeación de clase,
//    a partir de lo que el practicante ya escribió (aunque sea poco).
//  - "respuesta_comunidad": sugiere un borrador de respuesta a una pregunta
//    publicada en la Comunidad.

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

const PROMPT_PLANEACION = () => `Eres un asesor pedagógico experto ayudando a un practicante docente de la Escuela Normal Superior Federal de Aguascalientes (ENSFA) a estructurar una planeación de clase. Vas a recibir lo que el practicante ya escribió sobre su planeación: puede ser solo el tema, unas ideas sueltas, o un borrador más avanzado.

Tu tarea es proponer una estructura de planeación de clase concreta y práctica, basada en lo que te compartieron. Si es poco (por ejemplo, solo el tema o el grado), usa tu criterio pedagógico para proponer una estructura razonable a partir de eso.

Reglas:
- Organiza tu respuesta en secciones claras (por ejemplo: Propósito o aprendizaje esperado, Inicio, Desarrollo, Cierre, Evaluación), separadas por saltos de línea, en texto plano — sin usar markdown (nada de **, #, ni viñetas con guiones), porque el texto se va a insertar directo en un campo de planeación.
- Sé concreto: incluye ejemplos de actividades, no solo nombres de categorías vacías.
- Basa tu propuesta en el tema, grado o nivel que el practicante ya haya mencionado; si no fue claro, usa un enfoque general de educación básica en México.
- Esto es solo una SUGERENCIA que el practicante va a revisar, editar e insertar manualmente en su planeación — nunca la redactes como si ya fuera la publicación final y terminada.
- Responde ÚNICAMENTE con la propuesta de planeación. Sin encabezados tipo "Aquí tienes...", sin comillas, sin explicaciones sobre lo que hiciste.`;

const PROMPT_RESPUESTA_COMUNIDAD = () => `Eres un docente normalista mexicano con experiencia, participando en el foro de la Comunidad de practicantes de la Escuela Normal Superior Federal de Aguascalientes (ENSFA). Vas a leer una pregunta que publicó otro practicante (título y descripción) y debes redactar un borrador de respuesta útil para ayudarle.

Reglas:
- Da consejos prácticos y concretos, relacionados específicamente con lo que la persona preguntó — no des respuestas genéricas que servirían para cualquier pregunta.
- Sé breve pero completo (3 a 6 oraciones), cálido y cercano, como lo escribiría un compañero docente con experiencia ayudando a otro.
- No inventes datos, nombres ni situaciones que no estén en la pregunta.
- Este es solo un BORRADOR: la persona que responde lo va a revisar y editar antes de publicarlo, así que redáctalo en primera persona como si esa persona lo estuviera escribiendo.
- Responde ÚNICAMENTE con la respuesta sugerida. Sin encabezados, sin comillas, sin explicaciones adicionales.`;

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
  const TAREAS_VALIDAS = ["mejorar", "retroalimentacion", "planeacion", "respuesta_comunidad"];
  if (!TAREAS_VALIDAS.includes(tarea)) {
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
  const systemPrompt =
    tarea === "mejorar" ? PROMPT_MEJORAR(tipoTexto) :
    tarea === "planeacion" ? PROMPT_PLANEACION() :
    tarea === "respuesta_comunidad" ? PROMPT_RESPUESTA_COMUNIDAD() :
    PROMPT_RETROALIMENTACION(tipoTexto);

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
