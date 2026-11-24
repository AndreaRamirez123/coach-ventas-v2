// Única fuente de la API key de Gemini para toda la app.
// Prioridad: VITE_GEMINI_API_KEY (.env.local / variables del hosting) > GEMINI_API_KEY > API_KEY.
export const GEMINI_API_KEY: string =
  (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  '';
