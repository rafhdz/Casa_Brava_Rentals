// Configuración de la conexión con el backend Django.
//
// SERVER-ONLY por diseño: ningún Client Component habla directo con Django.
// El token JWT vive en cookies httpOnly (ver lib/api/session.ts), que el
// navegador no puede leer, así que toda petición sale de un Server Component,
// una Server Action o el middleware. Por eso `API_URL` NO lleva el prefijo
// `NEXT_PUBLIC_`: no hace falta exponerla al bundle del cliente.
export const API_BASE_URL = (process.env.API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

// Nombres de las cookies de sesión. El access token se manda en el header
// `Authorization: Bearer <token>` de cada petición; el refresh solo se usa
// contra /api/auth/token/refresh/ y /api/auth/logout/.
export const ACCESS_TOKEN_COOKIE = "cb_access";
export const REFRESH_TOKEN_COOKIE = "cb_refresh";

// Rutas de autenticación (SimpleJWT). Ver backend/README.md §4.
export const AUTH_ENDPOINTS = {
  token: "/api/auth/token/",
  refresh: "/api/auth/token/refresh/",
  logout: "/api/auth/logout/",
  registro: "/api/auth/registro/",
} as const;
