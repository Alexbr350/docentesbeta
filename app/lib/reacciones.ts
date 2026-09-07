// Utilidades para el sistema de reacciones múltiples (estilo Facebook) que
// reemplaza el anterior par de subcolecciones "likes"/"dislikes". Ahora cada
// publicación (o comentario) tiene una sola subcolección "reacciones" donde
// el ID de cada documento es el email del usuario y su campo `tipo` es una
// de las 6 reacciones de abajo — así cada persona solo puede tener UNA
// reacción activa a la vez (repetir setDoc sobre el mismo ID sobreescribe,
// nunca duplica).

export type TipoReaccion =
  | "me_gusta"
  | "me_encanta"
  | "me_divierte"
  | "me_sorprende"
  | "me_entristece"
  | "me_enoja";

export type DefinicionReaccion = {
  tipo: TipoReaccion;
  emoji: string;
  label: string;
  // Color de texto a usar cuando esta es la reacción activa del usuario —
  // distinto por tipo para que el botón "cambie de cara" visualmente, igual
  // que en Facebook.
  clase: string;
};

// Orden en el que aparecen en el menú flotante — igual al orden clásico de
// Facebook (Me gusta primero, ya que es la reacción por default).
export const REACCIONES: DefinicionReaccion[] = [
  { tipo: "me_gusta", emoji: "👍", label: "Me gusta", clase: "text-blue-600 dark:text-blue-400" },
  { tipo: "me_encanta", emoji: "❤️", label: "Me encanta", clase: "text-red-500 dark:text-red-400" },
  { tipo: "me_divierte", emoji: "😂", label: "Me divierte", clase: "text-yellow-500 dark:text-yellow-400" },
  { tipo: "me_sorprende", emoji: "😮", label: "Me sorprende", clase: "text-orange-500 dark:text-orange-400" },
  { tipo: "me_entristece", emoji: "😢", label: "Me entristece", clase: "text-indigo-500 dark:text-indigo-400" },
  { tipo: "me_enoja", emoji: "😡", label: "Me enoja", clase: "text-red-700 dark:text-red-500" },
];

export function reaccionPorTipo(tipo?: TipoReaccion | null): DefinicionReaccion | undefined {
  if (!tipo) return undefined;
  return REACCIONES.find((r) => r.tipo === tipo);
}

export type ConteoReacciones = Partial<Record<TipoReaccion, number>>;

/** Tipos de reacción presentes en un post/comentario, ordenados de mayor a menor uso — para el resumen visual (los 2-3 emojis más usados). */
export function reaccionesOrdenadas(conteo: ConteoReacciones | undefined): { tipo: TipoReaccion; cantidad: number }[] {
  if (!conteo) return [];
  return (Object.entries(conteo) as [TipoReaccion, number][])
    .filter(([, cantidad]) => (cantidad || 0) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, cantidad]) => ({ tipo, cantidad }));
}

export function totalReacciones(conteo: ConteoReacciones | undefined): number {
  if (!conteo) return 0;
  return Object.values(conteo).reduce((acc: number, n) => acc + (n || 0), 0);
}
