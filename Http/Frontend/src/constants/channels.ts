import type { ChannelInfo, ChannelOption } from '../types/chat';

function rgba(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}
function rgbaBg(r: number, g: number, b: number): string {
  return `rgba(${r},${g},${b},0.08)`;
}
function rgbaBgSys(r: number, g: number, b: number): string {
  return `rgba(${r},${g},${b},0.04)`;
}

export const CHANNEL_MAP: Record<number, ChannelInfo> = {
  // ---- Chat ----
  10: { label: 'Say', color: rgba(247, 247, 247), bg: rgbaBg(247, 247, 247), isSystem: false },
  11: { label: 'Shout', color: rgba(255, 166, 102), bg: rgbaBg(255, 166, 102), isSystem: false },
  12: { label: 'Tell', color: rgba(255, 105, 180), bg: rgbaBg(255, 105, 180), isSystem: false },
  13: { label: 'Tell', color: rgba(255, 105, 180), bg: rgbaBg(255, 105, 180), isSystem: false },
  14: { label: 'Party', color: rgba(102, 229, 255), bg: rgbaBg(102, 229, 255), isSystem: false },
  15: { label: 'Ally', color: rgba(255, 127, 0), bg: rgbaBg(255, 127, 0), isSystem: false },
  16: { label: 'LS1', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  17: { label: 'LS2', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  18: { label: 'LS3', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  19: { label: 'LS4', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  20: { label: 'LS5', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  21: { label: 'LS6', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  22: { label: 'LS7', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  23: { label: 'LS8', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  24: { label: 'FC', color: rgba(171, 219, 229), bg: rgbaBg(171, 219, 229), isSystem: false },
  27: { label: 'Novice', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  28: { label: 'Emote', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: false },
  29: { label: 'Emote', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: false },
  30: { label: 'Yell', color: rgba(255, 255, 0), bg: rgbaBg(255, 255, 0), isSystem: false },
  32: { label: 'Party', color: rgba(102, 229, 255), bg: rgbaBg(102, 229, 255), isSystem: false },
  36: { label: 'PvP', color: rgba(171, 219, 229), bg: rgbaBg(171, 219, 229), isSystem: false },
  37: { label: 'CWLS1', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  101: { label: 'CWLS2', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  102: { label: 'CWLS3', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  103: { label: 'CWLS4', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  104: { label: 'CWLS5', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  105: { label: 'CWLS6', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  106: { label: 'CWLS7', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  107: { label: 'CWLS8', color: rgba(212, 255, 125), bg: rgbaBg(212, 255, 125), isSystem: false },
  // ---- Battle ----
  41: { label: 'Damage', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  42: { label: 'Miss', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  43: { label: 'Action', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  44: { label: 'Item', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  45: {
    label: 'Healing',
    color: rgba(204, 204, 204),
    bg: rgbaBgSys(204, 204, 204),
    isSystem: true,
  },
  46: { label: 'Effect', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  47: { label: 'Debuff', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  48: { label: 'Buff', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  49: { label: 'Debuff', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  // ---- System ----
  55: { label: 'Alarm', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  56: { label: 'Echo', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  57: { label: 'System', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  58: { label: 'Battle', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  59: { label: 'Gather', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  60: { label: 'Error', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  61: { label: 'NPC', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  62: { label: 'Loot', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  64: { label: 'Prog', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  65: { label: 'Roll', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  66: { label: 'Craft', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  67: { label: 'Gather', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  69: { label: 'FC', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  70: { label: 'FC', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  71: { label: 'Market', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  72: {
    label: 'Recruit',
    color: rgba(204, 204, 204),
    bg: rgbaBgSys(204, 204, 204),
    isSystem: true,
  },
  73: { label: 'Sign', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  74: { label: 'Dice', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  75: { label: 'Novice', color: rgba(212, 255, 125), bg: rgbaBgSys(212, 255, 125), isSystem: true },
  76: { label: 'Music', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
  77: { label: 'PvP', color: rgba(171, 219, 229), bg: rgbaBgSys(171, 219, 229), isSystem: true },
  78: { label: 'PvP', color: rgba(171, 219, 229), bg: rgbaBgSys(171, 219, 229), isSystem: true },
  79: { label: 'Book', color: rgba(204, 204, 204), bg: rgbaBgSys(204, 204, 204), isSystem: true },
};

export const FALLBACK_CHANNEL: ChannelInfo = {
  label: 'System',
  color: rgba(204, 204, 204),
  bg: rgbaBgSys(204, 204, 204),
  isSystem: true,
};

export const ALL_CHANNELS: ChannelOption[] = [
  { label: 'Say', prefix: '/s ' },
  { label: 'Party', prefix: '/p ' },
  { label: 'Yell', prefix: '/y ' },
  { label: 'Shout', prefix: '/sh ' },
  { label: 'FreeCompany', prefix: '/fc ' },
  { label: 'Alliance', prefix: '/a ' },
  { label: 'Novice', prefix: '/n ' },
  { label: 'LS1', prefix: '/l1 ' },
  { label: 'LS2', prefix: '/l2 ' },
  { label: 'LS3', prefix: '/l3 ' },
  { label: 'LS4', prefix: '/l4 ' },
  { label: 'LS5', prefix: '/l5 ' },
  { label: 'LS6', prefix: '/l6 ' },
  { label: 'LS7', prefix: '/l7 ' },
  { label: 'LS8', prefix: '/l8 ' },
  { label: 'CWLS1', prefix: '/cwl1 ' },
  { label: 'CWLS2', prefix: '/cwl2 ' },
  { label: 'CWLS3', prefix: '/cwl3 ' },
  { label: 'CWLS4', prefix: '/cwl4 ' },
  { label: 'CWLS5', prefix: '/cwl5 ' },
  { label: 'CWLS6', prefix: '/cwl6 ' },
  { label: 'CWLS7', prefix: '/cwl7 ' },
  { label: 'CWLS8', prefix: '/cwl8 ' },
];

export const DEFAULT_CHANNELS: ChannelOption[] = ALL_CHANNELS.filter((c) =>
  ['/s ', '/p ', '/y ', '/sh ', '/fc ', '/a '].includes(c.prefix),
);

// Channel types that match the server-side TrackedTypes exactly
export const TRACKED_CHANNEL_TYPES: number[] = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 32, 36, 37, 101, 102,
  103, 104, 105, 106, 107, 56, 69, 70, 75, 77, 78,
];

export interface ChannelGroup {
  label: string;
  types: number[];
}

// Groups of channel types that are logically inseparable and shown as a single checkbox.
export const CHANNEL_GROUPS: ChannelGroup[] = [
  { label: 'Tell', types: [12, 13] },
  { label: 'Emote', types: [28, 29] },
  { label: 'Party', types: [14, 32] },
  { label: 'Free Company', types: [24, 69, 70] },
  { label: 'Novice Network', types: [27, 75] },
  { label: 'PvP Team', types: [36, 77, 78] },
];

export const PREFIX_TO_CHAT_TYPE: Record<string, number> = {
  '/s ': 10,
  '/sh ': 11,
  '/y ': 30,
  '/p ': 14,
  '/a ': 15,
  '/fc ': 24,
  '/n ': 27,
  '/l1 ': 16,
  '/l2 ': 17,
  '/l3 ': 18,
  '/l4 ': 19,
  '/l5 ': 20,
  '/l6 ': 21,
  '/l7 ': 22,
  '/l8 ': 23,
  '/cwl1 ': 37,
  '/cwl2 ': 101,
  '/cwl3 ': 102,
  '/cwl4 ': 103,
  '/cwl5 ': 104,
  '/cwl6 ': 105,
  '/cwl7 ': 106,
  '/cwl8 ': 107,
};
