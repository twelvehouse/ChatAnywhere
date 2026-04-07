/** Signals to useAuth that a 401 was received and the session has expired. */
export function dispatchUnauthorized(): void {
  window.dispatchEvent(new Event('auth:unauthorized'));
}
