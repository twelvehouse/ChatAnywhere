import { CHANNEL_MAP, FALLBACK_CHANNEL, PREFIX_TO_CHAT_TYPE } from '../constants/channels';
import type { ChannelInfo } from '../types/chat';

export function getChannelInfo(type: number): ChannelInfo {
  return CHANNEL_MAP[type] ?? FALLBACK_CHANNEL;
}

export function getBadgeInfoByPrefix(prefix: string): ChannelInfo {
  const type = PREFIX_TO_CHAT_TYPE[prefix];
  return type !== undefined ? getChannelInfo(type) : FALLBACK_CHANNEL;
}

/**
 * Adapt a channel color (designed for dark mode) to a luminance level that is
 * readable on a light background. Hue/chroma are preserved by scaling the
 * linear RGB components uniformly — only luminance is lowered.
 *
 * Algorithm:
 *   1. Compute sRGB relative luminance L
 *        lin(c) = (c/255 ≤ 0.04045) ? c/255/12.92 : ((c/255+0.055)/1.055)^2.4
 *        L = 0.2126·lin(R) + 0.7152·lin(G) + 0.0722·lin(B)
 *   2. If L > targetLum, scale each channel by √(targetLum / L).
 *
 * targetLum = 0.10 gives a WCAG contrast ratio of (1.0 + 0.05) / (0.10 + 0.05)
 * = 7:1 on white — borderline AAA, comfortably above the AA 4.5:1 threshold.
 */
export function adaptChannelColor(rgbStr: string, targetLum = 0.1): string {
  const m = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return rgbStr;
  const r = +m[1];
  const g = +m[2];
  const b = +m[3];
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  if (lum <= targetLum) return rgbStr;
  const scale = Math.sqrt(targetLum / lum);
  return `rgb(${Math.round(r * scale)},${Math.round(g * scale)},${Math.round(b * scale)})`;
}

/** Convert "rgb(r,g,b)" → "rgba(r,g,b,alpha)". Returns the input unchanged on a non-rgb string. */
export function rgbToRgba(rgbStr: string, alpha: number): string {
  const m = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return rgbStr;
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}
