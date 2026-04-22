export const sanitizeName = (s: string) => s.replace(/[\uE000-\uF8FF]/g, '').trim();

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const formatPlayerName = (name: string, world?: string) =>
  world ? `${name}@${world}` : name;

export function isSamePlayer(
  playerName: string,
  playerWorld: string | undefined,
  otherName: string,
  otherWorld: string | undefined,
): boolean {
  if (playerName !== otherName) return false;
  if (playerWorld && otherWorld) return playerWorld === otherWorld;
  return true;
}
