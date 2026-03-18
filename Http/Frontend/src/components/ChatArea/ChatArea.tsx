import type { KeyboardEvent, UIEvent } from 'react';
import styles from './ChatArea.module.css';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import type { ChatMessage, ChannelOption } from '../../types/chat';
import type { CustomFilter, FilterFolder } from '../../types/filter';

interface Props {
  // Header
  activeFilter: CustomFilter | null;
  filters: CustomFilter[];
  folders: FilterFolder[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onEditFilter: (filter: CustomFilter, oldName: string) => void;
  // Messages
  filteredMessages: ChatMessage[];
  isConnected: boolean;
  bannerCount: number;
  hasUnreadDown: boolean;
  loadOlder: () => void;
  hasMore: boolean;
  isLoadingOlder: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onDismissBanner: () => void;
  onScrollToBottom: () => void;
  onLinkClick: (url: string) => void;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  // Tell mode
  replyTarget: { name: string; world?: string } | null;
  replyPinned: boolean;
  tellModeAll: boolean;
  onReply: (name: string, world?: string) => void;
  onClearReply: () => void;
  onToggleReplyPin: () => void;
  trustedDomains: Set<string>;
  // Input
  inputText: string;
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  showCharPicker: boolean;
  onInputChange: (text: string) => void;
  onSendPrefixChange: (prefix: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSendClick: () => void;
  onToggleCharPicker: () => void;
}

export function ChatArea({
  activeFilter,
  filters,
  folders,
  isSidebarOpen,
  onToggleSidebar,
  onEditFilter,
  filteredMessages,
  isConnected,
  bannerCount,
  hasUnreadDown,
  loadOlder,
  hasMore,
  isLoadingOlder,
  messagesContainerRef,
  scrollToBottomRef,
  onScroll,
  onDismissBanner,
  onScrollToBottom,
  onLinkClick,
  italicizeSystem,
  useColoredBackground,
  replyTarget,
  replyPinned,
  tellModeAll,
  onReply,
  onClearReply,
  onToggleReplyPin,
  trustedDomains,
  inputText,
  sendChannels,
  selectedSendPrefix,
  showCharPicker,
  onInputChange,
  onSendPrefixChange,
  onKeyDown,
  onSendClick,
  onToggleCharPicker,
}: Props) {
  return (
    <div className={styles['chat-area']}>
      <ChatHeader
        activeFilter={activeFilter}
        filters={filters}
        folders={folders}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        onEditFilter={onEditFilter}
      />

      <MessageList
        messages={filteredMessages}
        isConnected={isConnected}
        bannerCount={bannerCount}
        hasUnreadDown={hasUnreadDown}
        loadOlder={loadOlder}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        messagesContainerRef={messagesContainerRef}
        scrollToBottomRef={scrollToBottomRef}
        onScroll={onScroll}
        onDismissBanner={onDismissBanner}
        onScrollToBottom={onScrollToBottom}
        onLinkClick={onLinkClick}
        italicizeSystem={italicizeSystem}
        useColoredBackground={useColoredBackground}
        tellModeAll={tellModeAll}
        onReply={onReply}
        trustedDomains={trustedDomains}
      />

      <InputArea
        inputText={inputText}
        isConnected={isConnected}
        sendChannels={sendChannels}
        selectedSendPrefix={selectedSendPrefix}
        showCharPicker={showCharPicker}
        onInputChange={onInputChange}
        onSendPrefixChange={onSendPrefixChange}
        onKeyDown={onKeyDown}
        onSendClick={onSendClick}
        onToggleCharPicker={onToggleCharPicker}
        replyTarget={replyTarget}
        replyPinned={replyPinned}
        onClearReply={onClearReply}
        onToggleReplyPin={onToggleReplyPin}
      />
    </div>
  );
}
