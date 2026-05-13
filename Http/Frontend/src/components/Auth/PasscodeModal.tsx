import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import type { AuthResult, AuthStatus } from '../../hooks/useAuth';
import styles from './PasscodeModal.module.css';

interface Props {
  status: AuthStatus;
  onAuthenticate: (passcode: string) => Promise<AuthResult>;
}

export function PasscodeModal({ status, onAuthenticate }: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formRevealed, setFormRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reveal the form with a CSS transition once a response is received
  useEffect(() => {
    if (status === 'unauthenticated' || status === 'not-configured') {
      const raf = requestAnimationFrame(() => setFormRevealed(true));
      return () => {
        cancelAnimationFrame(raf);
        setFormRevealed(false);
      };
    }
  }, [status]);

  // Focus input after the reveal transition settles
  useEffect(() => {
    if (!formRevealed || status !== 'unauthenticated') return;
    const t = setTimeout(() => inputRef.current?.focus(), 360);
    return () => clearTimeout(t);
  }, [formRevealed, status]);

  const handleSubmit = async () => {
    if (passcode.length < 4 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    const result = await onAuthenticate(passcode);
    setIsSubmitting(false);
    if (result === 'wrong') {
      setError('Incorrect passcode. Please try again.');
      setPasscode('');
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (result === 'not-configured') {
      setError('No passcode is set. Please configure one in the plugin settings.');
    } else if (result === 'error') {
      setError('Connection failed. Make sure the plugin is running.');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setPasscode(digits);
    if (error) setError(null);
  };

  const isConnecting = status === 'loading' || status === 'unreachable';
  const isNotConfigured = status === 'not-configured';

  return (
    <div className="modal-overlay">
      <div className={styles.card}>
        <div className={styles.lockIcon}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className={styles.title}>ChatAnywhere</h1>

        {isConnecting && (
          <div className={styles.connecting}>
            <p className={styles.connectingText}>
              {status === 'unreachable' ? 'Could not reach plugin — retrying…' : 'Connecting…'}
            </p>
            <div className={styles.connectingDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div className={`${styles.formBody} ${formRevealed ? styles.formRevealed : ''}`}>
          <div className={styles.formBodyInner}>
            <p className={styles.subtitle}>
              {isNotConfigured
                ? 'Plugin configuration required'
                : 'Enter your passcode to continue'}
            </p>

            {!isNotConfigured && (
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                className={styles.input}
                value={passcode}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (formRevealed) inputRef.current?.focus();
                }}
                placeholder="••••"
                disabled={isSubmitting}
                autoComplete="off"
              />
            )}

            {error && <p className={styles.error}>{error}</p>}

            {!isNotConfigured && (
              <button
                className={styles.button}
                onClick={handleSubmit}
                disabled={passcode.length < 4 || isSubmitting}
              >
                {isSubmitting ? 'Verifying…' : 'Unlock'}
              </button>
            )}

            {isNotConfigured && (
              <p className={styles.hint}>
                Open the plugin settings in FFXIV and set a 4–8 digit passcode under Security, then
                reload this page.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
