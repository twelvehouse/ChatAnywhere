import { CHANNEL_MAP, FALLBACK_CHANNEL, PREFIX_TO_CHAT_TYPE } from '../constants/channels';
import type { ChannelInfo } from '../types/chat';

export function getChannelInfo(type: number): ChannelInfo {
  return CHANNEL_MAP[type] ?? FALLBACK_CHANNEL;
}

export function getBadgeInfoByPrefix(prefix: string): ChannelInfo {
  const type = PREFIX_TO_CHAT_TYPE[prefix];
  return type !== undefined ? getChannelInfo(type) : FALLBACK_CHANNEL;
}
