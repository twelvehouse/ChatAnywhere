import type { CSSProperties } from 'react';
import type { ThemeTokens } from './types';
import { getChannelInfo, rgbToRgba } from '../lib/channelUtils';
import { TELL_OUTGOING } from '../constants/channels';

const TELL_RAW = getChannelInfo(TELL_OUTGOING).color;

// Badge: `color` only — the CSS `border: 1px solid;` picks up currentColor and
// background stays transparent. Light theme intentionally adds a tint instead.
export const darkTheme: ThemeTokens = {
  badgeStyle: (ch) => ({ color: ch.color }),
  channelTextColor: (ch) => ch.color,
  messageBgColor: (ch) => ch.bg,
  channelSelectActiveBg: (ch) => `${ch.color}22`,
  tellVars: {
    '--tell-color': TELL_RAW,
    '--tell-bg': rgbToRgba(TELL_RAW, 0.08),
    '--tell-border': rgbToRgba(TELL_RAW, 0.2),
    '--tell-pin-bg': rgbToRgba(TELL_RAW, 0.12),
    '--tell-pin-border': rgbToRgba(TELL_RAW, 0.4),
    '--tell-pin-bg-hover': rgbToRgba(TELL_RAW, 0.2),
  } as CSSProperties,
};
