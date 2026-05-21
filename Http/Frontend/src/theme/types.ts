import type { CSSProperties } from 'react';
import type { ChannelInfo } from '../types/chat';

// Per-theme strategy object consumed via `useTheme()`. Covers only the
// dynamic values that depend on a channel input — static tokens live in CSS
// variables (see index.css).
export interface ThemeTokens {
  badgeStyle(ch: ChannelInfo): CSSProperties;
  channelTextColor(ch: ChannelInfo): string;
  messageBgColor(ch: ChannelInfo): string;
  channelSelectActiveBg(ch: ChannelInfo): string;
  /** CSS variables driving the Tell banner & pin button (see InputArea.module.css). */
  tellVars: CSSProperties;
  /** Path to the avatar fallback image used when /avatar lookup fails. */
  avatarPlaceholder: string;
}
