import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

// Asistente de IA de ENSFA+. Llama a la API de Google Gemini (capa gratuita)
// desde el servidor — la API key nunca se expone al cliente. Tareas
// soportadas:
//  - "mejorar": mejora la redacción de un texto que el practicante ya escribió.
//  - "retroalimentacion": genera un borrador de comentario para el evaluador.
//  - "planeacion": sugiere estructura/actividades para una planeación de clase,
//    a partir de lo que el practicante ya escribió (aunque sea poco).
//  - "respuesta_comunidad": sugiere un borrador de respuesta a una pregunta
//    publicada en la Comunidad.
//  - "calificacion": sugiere una calificación del 1 al 10 con justificación
//    para una publicación (el evaluador siempre confirma manualmente).
//  - "deteccion_atencion": revisa publicaciones de "Pedir ayuda" recientes de
//    varios practicantes y devuelve, en JSON, cuáles podrían necesitar
//    seguimiento y por qué (solo informativo, nunca contacta a nadie).

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

const PROMPT_CALIFICACION = (tipo: string) => `Eres un maestro normalista mexicano con experiencia, evaluando publicaciones de practicantes docentes de la Escuela Normal Superior Federal de Aguascalientes (ENSFA) en su portafolio digital. Vas a leer una publicación de tipo "${tipo}" y debes proponer una calificación sugerida del 1 al 10, junto con una breve justificación.

Reglas:
- Evalúa la calidad, claridad, profundidad y cumplimiento de lo esperado para ese tipo de publicación, según el nivel típico de un practicante docente en formación — ni excesivamente estricto ni condescendiente.
- La calificación debe ser un número entero del 1 al 10.
- La justificación debe ser breve (1 a 2 oraciones), específica sobre el contenido del texto, explicando por qué diste ese número.
- Esto es solo una SUGERENCIA: el evaluador (maestro o administrador) es quien decide y confirma la calificación final con un clic manual — tú nunca calificas ni guardas nada directamente.
- Responde ÚNICAMENTE en este formato exacto, sin nada más antes o después:
Calificación: <número del 1 al 10>
Justificación: <tu justificación breve>`;

const PROMPT_DETECCION_ATENCION = () => `Eres un asesor pedagógico experto ayudando a los evaluadores de la Escuela Normal Superior Federal de Aguascalientes (ENSFA) a identificar practicantes docentes que podrían estar teniendo dificultades y necesitar seguimiento cercano.

Vas a recibir un resumen de publicaciones recientes de tipo "Pedir ayuda" de varios practicantes, agrupadas por practicante (con su nombre y correo), y de cuántas publicaciones recientes tiene en total como contexto adicional.

Tu tarea es identificar cuáles de estos practicantes parecen tener dificultades genuinas (no solo dudas rutinarias o preguntas puntuales) según el contenido de lo que escribieron, y para cada uno escribir una razón breve explicando por qué lo marcaste.

Reglas:
- Solo incluye practicantes cuyo contenido sugiera dificultades reales: estrés, sentirse perdidos o abrumados, problemas recurrentes, señales de agobio, etc. No incluyas a alguien que solo hizo una pregunta simple, técnica o puntual.
- Basa tu análisis únicamente en el contenido que se te compartió; no inventes situaciones ni datos que no estén ahí.
- La razón debe ser específica al contenido de ese practicante (1 a 2 oraciones), no genérica ni copiada entre practicantes.
- Usa exactamente el correo que te dieron para cada practicante, sin modificarlo.
- Esto es solo información para que el evaluador le dé seguimiento — nunca es una acción automática, ni contacta ni notifica al practicante de ninguna forma.
- Responde ÚNICAMENTE con un arreglo JSON (puede ser vacío si nadie muestra señales de dificultad real), sin texto adicional antes o después.`;

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
  const TAREAS_VALIDAS = ["mejorar", "retroalimentacion", "planeacion", "respuesta_comunidad", "calificacion", "deteccion_atencion"];
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
    tarea === "calificacion" ? PROMPT_CALIFICACION(tipoTexto) :
    tarea === "deteccion_atencion" ? PROMPT_DETECCION_ATENCION() :
    PROMPT_RETROALIMENTACION(tipoTexto);

  // "deteccion_atencion" necesita una lista estructurada de vuelta (no texto
  // libre), así que le pedimos a Gemini que responda en JSON siguiendo un
  // esquema fijo, en vez de parsear texto libre del lado del cliente.
  const configExtra =
    tarea === "deteccion_atencion"
      ? {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                email: { type: Type.STRING },
                razon: { type: Type.STRING },
              },
              required: ["email", "razon"],
            },
          },
        }
      : {};

  try {
    const ai = new GoogleGenAI({ apiKey });

    const respuestaGemini = await ai.models.generateContent({
      model: MODELO_GEMINI,
      contents: texto,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: tarea === "deteccion_atencion" ? 2048 : 1024,
        ...configExtra,
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
