import { setupWorker } from 'msw/browser';
import { MOCK_PLAYER, MOCK_CHANNELS } from '../../mock/data';
import { handlers } from './handlers';

/**
 * MSW worker used by the in-browser demo mode (`?demo` query param).
 * Mirrors the contract of the real plugin server using the mock data.
 */
export const worker = setupWorker(...handlers);

interface ConnectedEvent {
  type: 'connected';
}
interface ActiveChannelEvent {
  type: 'active-channel';
  prefix: string;
}
interface PlayerInfoEvent {
  type: 'player-info';
  name: string;
  world: string;
}
type DemoSseEvent = ConnectedEvent | ActiveChannelEvent | PlayerInfoEvent | typeof MOCK_CHANNELS;

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

  private _send(data: DemoSseEvent): void {
    const ev = new MessageEvent('message', { data: JSON.stringify(data) });
    if (this.onmessage) this.onmessage(ev);
    this.dispatchEvent(ev);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }
}

/**
 * Starts the MSW worker and patches EventSource so SSE works without a real server.
 * Called from main.tsx when `?demo` is present.
 */
export async function installDemoMode(): Promise<void> {
  console.info('[ChatAnywhere] Demo mode active — chat/settings are mocked.');
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith('avatar_')) sessionStorage.removeItem(key);
  }
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).EventSource = MockEventSource;
}
