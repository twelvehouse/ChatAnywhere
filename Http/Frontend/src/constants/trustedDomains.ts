/**
 * Built-in trusted domains that are always considered safe for link previews.
 * Users can add their own domains in Settings > Security.
 */
export const BUILT_IN_TRUSTED_DOMAINS: ReadonlySet<string> = new Set([
  // ---- Video ----
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'img.youtube.com', // thumbnails

  // ---- Discord ----
  'cdn.discordapp.com',
  'media.discordapp.net',
  'discord.com',

  // ---- Twitter / X ----
  'x.com',
  'twitter.com',
  'pbs.twimg.com', // images
  'video.twimg.com', // videos

  // ---- Image hosting ----
  'i.imgur.com',
  'imgur.com',
  'i.gyazo.com', // Gyazo — popular for screenshots in Japanese communities
  'c.tenor.com', // Tenor GIFs
  'media.giphy.com', // Giphy GIFs
  'i.postimg.cc', // PostImage
  'i.redd.it', // Reddit
  'preview.redd.it',

  // ---- FFXIV / Square Enix ----
  'img2.finalfantasyxiv.com',
  'jp.finalfantasyxiv.com',
  'na.finalfantasyxiv.com',
  'eu.finalfantasyxiv.com',

  // ---- Japanese gaming info sites ----
  'game8.jp',
  'www.game8.jp',
  'altema.jp',
  'www.altema.jp',
  'wikiwiki.jp', // hosts many FF14 community wikis

  // ---- Streaming ----
  'www.twitch.tv',
  'twitch.tv',
  'clips.twitch.tv',
  'static-cdn.jtvnw.net', // Twitch CDN

  // ---- Other ----
  'steamcommunity.com',
  'store.steampowered.com',
]);

/** Returns true if the hostname is in the built-in or user-added trusted list. */
export function isTrustedDomain(hostname: string, userTrusted: Set<string>): boolean {
  return BUILT_IN_TRUSTED_DOMAINS.has(hostname) || userTrusted.has(hostname);
}

/** Parses a URL and returns its hostname, or null if invalid. */
export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Returns true if the URL points to a direct image resource. */
export function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(jpe?g|png|gif|webp|avif|bmp)(\?|$|#)/.test(pathname);
  } catch {
    return false;
  }
}

/** Extracts a YouTube video ID from a youtube.com or youtu.be URL, or null. */
export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split(/[?#]/)[0] || null;
    if (u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') {
      return u.searchParams.get('v');
    }
  } catch {
    /* invalid URL */
  }
  return null;
}
