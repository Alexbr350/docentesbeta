// Lista compartida de correos con acceso de administrador.
// Se usa tanto en app/admin/page.tsx (protección de la ruta) como en
// app/components/Navbar.tsx (mostrar el acceso rápido y la insignia) para
// evitar mantener la misma lista duplicada en varios archivos.
export const ADMINS: string[] = [
  "eira.vargas@ensfa.edu.mx",
  "alejandro_br.his23u@ensfa.edu.mx",
];
