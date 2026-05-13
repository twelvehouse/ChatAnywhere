import { useState, useEffect, useCallback } from 'react';
import { RELAY_ADDR } from '../constants/config';

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'not-configured'
  | 'unreachable';
export type AuthResult = 'ok' | 'wrong' | 'not-configured' | 'error';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    let retryTimeoutId: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    const tryConnect = () => {
      fetch(`${RELAY_ADDR}/settings`, { credentials: 'include' })
        .then((res) => {
          if (cancelled) return;
          if (res.ok) setStatus('authenticated');
          else if (res.status === 503) setStatus('not-configured');
          else setStatus('unauthenticated'); // 401 or any other server error
        })
        .catch(() => {
          if (cancelled) return;
          retryCount++;
          setStatus('unreachable');
          const delay = Math.min(1000 * 2 ** retryCount, 16000);
          retryTimeoutId = setTimeout(tryConnect, delay);
        });
    };

    tryConnect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeoutId);
    };
  }, []);

  // Listen for 401s dispatched by other hooks so the login screen reappears
  useEffect(() => {
    const handler = () => setStatus('unauthenticated');
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const authenticate = useCallback(async (passcode: string): Promise<AuthResult> => {
    try {
      const res = await fetch(`${RELAY_ADDR}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        setStatus('authenticated');
        return 'ok';
      }
      if (res.status === 503) return 'not-configured';
      return 'wrong';
    } catch {
      return 'error';
    }
  }, []);

  return { status, authenticate };
}
