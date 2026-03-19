import type { ChatMessage, ChannelOption } from './chat';

/**
 * Discriminated union of all possible SSE event payloads.
 * System events are identified by the `type` string literal;
 * chat messages fall through to ChatMessage (which has no `type` field).
 */
export type SseEvent =
  | { type: 'connected' }
  | { type: 'ping' }
  | { type: 'reset' }
  | { type: 'player-info'; name: string; world: string }
  | { type: 'channels'; channels: ChannelOption[] }
  | { type: 'active-channel'; prefix: string }
  | (ChatMessage & { type?: never });
