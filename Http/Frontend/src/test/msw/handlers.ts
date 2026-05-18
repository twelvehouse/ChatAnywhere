import { http, HttpResponse } from 'msw';
import {
  MOCK_PLAYER,
  MOCK_CHANNELS,
  MOCK_SETTINGS,
  MOCK_FILTER_MODE,
  MOCK_MESSAGES,
  MOCK_CHARACTERS,
  MOCK_PLAYER_AVATAR_URL,
  getAvatarForName,
} from '../../mock/data';

const MOCK_CHARACTER_NAMES = new Set([
  MOCK_PLAYER.name,
  'Baldur Grimstone',
  'Finn Ashwood',
  'Caelum Arke',
  'Thalise Maron',
  'Nael Orenthal',
]);

// Settings live in-process so PUT updates round-trip back through GET.
let mockSettings: Record<string, unknown> = { ...MOCK_SETTINGS };

export const handlers = [
  // ── Settings ────────────────────────────────────────────────────
  http.get('/settings', () => HttpResponse.json(mockSettings)),
  http.put('/settings', async ({ request }) => {
    try {
      mockSettings = (await request.json()) as Record<string, unknown>;
    } catch {
      /* ignore malformed bodies */
    }
    return HttpResponse.json({ ok: true });
  }),

  // ── Filter mode ─────────────────────────────────────────────────
  http.get('/settings/filter-mode', () => HttpResponse.json(MOCK_FILTER_MODE)),
  http.post('/settings/filter-mode', () => HttpResponse.json({ ok: true })),
  http.delete('/settings/filter-mode', () => HttpResponse.json({ ok: true })),

  // ── Characters ──────────────────────────────────────────────────
  http.get('/settings/characters', () => HttpResponse.json(MOCK_CHARACTERS)),
  http.delete('/settings/characters', () => HttpResponse.json({ ok: true })),

  // ── History ─────────────────────────────────────────────────────
  http.get('/history', ({ request }) => {
    const url = new URL(request.url);
    const beforeParam = url.searchParams.get('before');
    const before = beforeParam !== null ? Number(beforeParam) : null;
    const msgs =
      before !== null ? MOCK_MESSAGES.filter((m) => m.Timestamp < before) : MOCK_MESSAGES;
    return HttpResponse.json(msgs);
  }),

  // ── Channels ────────────────────────────────────────────────────
  http.get('/channels', () => HttpResponse.json(MOCK_CHANNELS)),

  // ── Avatar (whitelist only — unknown names get null URL so the UI falls back to anonymous) ──
  http.get('/avatar', ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') ?? '';
    if (MOCK_CHARACTER_NAMES.has(name)) {
      const avatarUrl = name === MOCK_PLAYER.name ? MOCK_PLAYER_AVATAR_URL : getAvatarForName(name);
      return HttpResponse.json({ avatarUrl });
    }
    return HttpResponse.json({ avatarUrl: '' });
  }),

  // ── Send (no-op in mock) ────────────────────────────────────────
  http.post('/send', () => HttpResponse.json('OK')),

  // ── SSE (kept open forever so the client stays in "connecting" without errors) ──
  http.get('/sse', () => new HttpResponse(null, { status: 200 })),
];
