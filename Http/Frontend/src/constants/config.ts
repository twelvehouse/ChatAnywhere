// In dev (Vite, port 5173): point to the plugin server on port 3000.
// In production (static files served by the plugin): use the same origin — port is whatever the server is running on.
export const RELAY_ADDR = import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : window.location.origin;

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
