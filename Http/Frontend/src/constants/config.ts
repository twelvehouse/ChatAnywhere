// In dev (Vite, port 5173): Vite proxies API routes to localhost:3000, so same-origin — use empty string.
// In production (static files served by the plugin): use the same origin.
export const RELAY_ADDR = import.meta.env.DEV ? '' : window.location.origin;

export const FONTS = [
  'Inter',
  'Noto Sans JP',
  'Noto Serif JP',
  'M PLUS 1p',
  'M PLUS Rounded 1c',
  'Roboto',
  'Roboto Mono',
  'Roboto Serif',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Outfit',
  'Plus Jakarta Sans',
  'Kosugi',
  'Kosugi Maru',
  'Sawarabi Gothic',
  'Sawarabi Mincho',
  'Zen Kaku Gothic New',
  'Zen Maru Gothic',
  'Shippori Mincho',
  'Zen Old Mincho',
  'Klee One',
  'DotGothic16',
  'Dela Gothic One',
];
