import type { CSSProperties } from 'react';
import type { ThemeTokens } from './types';
import { adaptChannelColor, getChannelInfo, rgbToRgba } from '../lib/channelUtils';
import { TELL_OUTGOING } from '../constants/channels';

const TELL_RAW = getChannelInfo(TELL_OUTGOING).color;
const TELL_LIGHT = adaptChannelColor(TELL_RAW);

// Channel colors are darkened via adaptChannelColor() to stay legible on white.
export const lightTheme: ThemeTokens = {
  badgeStyle: (ch) => {
    const adapted = adaptChannelColor(ch.color);
    return {
      color: adapted,
      borderColor: rgbToRgba(adapted, 0.45),
      background: rgbToRgba(ch.color, 0.1),
    };
  },
  channelTextColor: (ch) => adaptChannelColor(ch.color),
  messageBgColor: (ch) => rgbToRgba(ch.color, 0.06),
  channelSelectActiveBg: (ch) => rgbToRgba(ch.color, 0.1),
  tellVars: {
    '--tell-color': TELL_LIGHT,
    '--tell-bg': rgbToRgba(TELL_LIGHT, 0.06),
    '--tell-border': rgbToRgba(TELL_LIGHT, 0.22),
    '--tell-pin-bg': rgbToRgba(TELL_LIGHT, 0.08),
    '--tell-pin-border': rgbToRgba(TELL_LIGHT, 0.35),
    '--tell-pin-bg-hover': rgbToRgba(TELL_LIGHT, 0.14),
  } as CSSProperties,
  avatarPlaceholder: '/assets/anonymous-light.png',
};
