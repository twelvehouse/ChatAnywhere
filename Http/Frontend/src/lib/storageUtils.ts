import { DISABLED_CHANNELS_KEY, TRUSTED_DOMAINS_KEY } from '../constants/storage';

export function loadDisabledChannels(): Set<string> {
  try {
    const raw = localStorage.getItem(DISABLED_CHANNELS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* corrupt localStorage value — ignore and return default */
  }
  return new Set();
}

export function saveDisabledChannels(set: Set<string>): void {
  localStorage.setItem(DISABLED_CHANNELS_KEY, JSON.stringify([...set]));
}

export function loadTrustedDomains(): Set<string> {
  try {
    const saved = localStorage.getItem(TRUSTED_DOMAINS_KEY);
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {
    /* corrupt localStorage value — ignore and return default */
  }
  return new Set();
}

export function saveTrustedDomains(set: Set<string>): void {
  localStorage.setItem(TRUSTED_DOMAINS_KEY, JSON.stringify(Array.from(set)));
}
