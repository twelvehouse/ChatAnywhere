export interface ChatPayload {
  Type: 'text' | 'icon';
  Text?: string;
  IconId?: number;
}

export interface ChatMessage {
  Type: number;
  SenderName: string;
  SenderWorld?: string;
  /** TellOutgoing only: the name of the player this message was sent to. */
  RecipientName?: string;
  /** TellOutgoing only: the home world of the recipient. */
  RecipientWorld?: string;
  MessagePayloads: ChatPayload[];
  Timestamp: number;
}

export interface ChannelOption {
  label: string;
  prefix: string;
}

export interface ChannelInfo {
  label: string;
  color: string;
  bg: string;
  isSystem: boolean;
}
