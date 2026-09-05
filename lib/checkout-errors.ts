// Vive fuera de app/actions/checkout.ts ("use server") porque un archivo
// "use server" solo puede exportar funciones async — una constante de string
// ahí rompe el build. Importado tanto por checkout.ts (server) como por
// CartView.tsx (client) para no duplicar el mensaje como string mágico.
export const RESERVATION_REQUIRED_ERROR = "Primero debes reservar tu estadía antes de agregar servicios.";
