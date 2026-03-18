export interface CustomFilter {
  name: string; // used as ID — alphanumeric, hyphens, and underscores only
  showChannelTypes: number[]; // channel type IDs to show (empty = show nothing)
  defaultSendPrefix: string | null; // null = sync with game
  notifyUnread: boolean; // whether to show the unread badge
}

export interface FilterFolder {
  name: string; // used as ID — alphanumeric, hyphens, and underscores only
  filters: string[]; // filter names in display order
}

export const FILTER_NAME_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;
export const FILTER_NAME_ERROR =
  'Only letters, numbers, hyphens and underscores allowed (max 32 chars)';
