import {
  MOCK_PLAYER,
  MOCK_CHANNELS,
  MOCK_SETTINGS,
  MOCK_FILTER_MODE,
  MOCK_MESSAGES,
  MOCK_CHARACTERS,
  MOCK_PLAYER_AVATAR_URL,
  getAvatarForName,
} from './data';

const MOCK_CHARACTER_NAMES = new Set([
  MOCK_PLAYER.name,
  'Baldur Grimstone',
  'Finn Ashwood',
  'Caelum Arke',
  'Thalise Maron',
  'Nael Orenthal',
]);

let mockSettings = { ...MOCK_SETTINGS };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getPathname(url: string): string {
  if (url.startsWith('/')) return url.split('?')[0];
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0];
  }
}

function getSearchParams(url: string): URLSearchParams {
  try {
    const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    return new URLSearchParams(q);
  } catch {
    return new URLSearchParams();
  }
}

const originalFetch = window.fetch.bind(window);

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const pathname = getPathname(url);

  if (pathname === '/settings') {
    if (method === 'GET') return Promise.resolve(jsonResponse(mockSettings));
    if (method === 'PUT') {
      return (async () => {
        try {
          const body = init?.body;
          const text =
            typeof body === 'string' ? body : body instanceof Blob ? await body.text() : null;
          if (text) mockSettings = JSON.parse(text);
        } catch {
          /* ignore */
        }
        return jsonResponse({ ok: true });
      })();
    }
  }

  if (pathname === '/settings/filter-mode') {
    if (method === 'GET') return Promise.resolve(jsonResponse(MOCK_FILTER_MODE));
    if (method === 'POST' || method === 'DELETE')
      return Promise.resolve(jsonResponse({ ok: true }));
  }

  if (pathname === '/settings/characters') {
    if (method === 'GET') return Promise.resolve(jsonResponse(MOCK_CHARACTERS));
    if (method === 'DELETE') return Promise.resolve(jsonResponse({ ok: true }));
  }

  if (pathname === '/history' && method === 'GET') {
    const params = getSearchParams(url);
    const before = params.get('before') !== null ? Number(params.get('before')) : null;
    const msgs =
      before !== null ? MOCK_MESSAGES.filter((m) => m.Timestamp < before) : MOCK_MESSAGES;
    return Promise.resolve(jsonResponse(msgs));
  }

  if (pathname === '/channels' && method === 'GET') {
    return Promise.resolve(jsonResponse(MOCK_CHANNELS));
  }

  if (pathname === '/avatar' && method === 'GET') {
    const params = getSearchParams(url);
    const name = params.get('name') ?? '';
    if (MOCK_CHARACTER_NAMES.has(name)) {
      const avatarUrl = name === MOCK_PLAYER.name ? MOCK_PLAYER_AVATAR_URL : getAvatarForName(name);
      return Promise.resolve(jsonResponse({ avatarUrl }));
    }
  }

  // /auth, /emotes, and unrecognized /avatar pass through to the real server

  if (pathname === '/send' && method === 'POST') {
    return Promise.resolve(new Response(JSON.stringify('OK'), { status: 200 }));
  }

  if (pathname === '/sse') {
    return new Promise(() => {});
  }

  return originalFetch(input, init);
}

class MockEventSource extends EventTarget {
  readyState: number = 0;
  readonly url: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onopen: ((ev: Event) => void) | null = null;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  constructor(url: string) {
    super();
    this.url = url;
    this.readyState = MockEventSource.OPEN;
    setTimeout(() => this._init(), 80);
  }

  private _init(): void {
    this._send({ type: 'connected' });
    this._send(MOCK_CHANNELS);
    this._send({ type: 'active-channel', prefix: '/s ' });
    this._send({ type: 'player-info', name: MOCK_PLAYER.name, world: MOCK_PLAYER.world });
  }

  private _send(data: unknown): void {
    const ev = new MessageEvent('message', { data: JSON.stringify(data) });
    if (this.onmessage) this.onmessage(ev);
    this.dispatchEvent(ev);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }
}

export function installMockMode(): void {
  console.info('[ChatAnywhere] Demo mode active — chat/settings are mocked.');
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith('avatar_')) sessionStorage.removeItem(key);
  }
  window.fetch = mockFetch as typeof window.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).EventSource = MockEventSource;
}
