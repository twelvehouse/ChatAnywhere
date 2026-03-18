export const sanitizeName = (s: string) => s.replace(/[\uE000-\uF8FF]/g, '').trim();

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
