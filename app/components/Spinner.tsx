"use client";

// Spinner de marca reutilizable: reemplaza los "Cargando..." / "Generando..."
// en texto plano que había regados por la app (páginas al cargar, respuestas
// de IA, etc.) por algo visual y consistente con el resto de la plataforma
// (mismo azul de marca, mismo estilo redondeado).
//
// Uso típico:
//   <Spinner />                          -> solo el anillo, tamaño mediano
//   <Spinner texto="Generando..." />      -> anillo + texto al lado
//   <Spinner tamano={32} centrado />      -> centrado en su contenedor (para pantallas de carga completas)

export default function Spinner({
  tamano = 20,
  texto,
  centrado = false,
  claseContenedor = "",
}: {
  /** Diámetro del anillo en px. */
  tamano?: number;
  /** Texto opcional junto al anillo (ej. "Generando respuesta..."). */
  texto?: string;
  /** Si es true, centra el spinner (horizontal y verticalmente) dentro de su contenedor, con un poco de padding — pensado para pantallas de carga de página completa. */
  centrado?: boolean;
  claseContenedor?: string;
}) {
  const anillo = (
    <span
      role="status"
      aria-label="Cargando"
      className="inline-block rounded-full border-slate-200 dark:border-slate-700 border-t-blue-600 animate-spin"
      style={{ width: tamano, height: tamano, borderWidth: Math.max(2, Math.round(tamano / 10)) }}
    />
  );

  if (centrado) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 py-10 animate-fade-in ${claseContenedor}`}>
        {anillo}
        {texto && <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{texto}</p>}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${claseContenedor}`}>
      {anillo}
      {texto && <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{texto}</span>}
    </span>
  );
}
