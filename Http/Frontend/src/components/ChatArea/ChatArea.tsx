import type { UIEvent } from 'react';
import styles from './ChatArea.module.css';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import type { ChatMessage, ChannelOption, TellPartner } from '../../types/chat';
import type { CustomFilter } from '../../types/filter';

interface Props {
  activeDmTarget: TellPartner | null;
  // Header
  activeFilter: CustomFilter | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onEditFilter: (filter: CustomFilter, oldName: string) => void;
  // Messages
  filteredMessages: ChatMessage[];
  bannerCount: number;
  hasUnreadDown: boolean;
  loadOlder: () => void;
  hasMore: boolean;
  isLoadingOlder: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesInnerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onDismissBanner: () => void;
  onScrollToBottom: () => void;
  onLinkClick: (url: string) => void;
  // Tell mode (replyTarget/replyPinned stay as props for now)
  replyTarget: { name: string; world?: string } | null;
  replyPinned: boolean;
  onReply: (name: string, world?: string) => void;
  onClearReply: () => void;
  onToggleReplyPin: () => void;
  // Input
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  showCharPicker: boolean;
  onSend: (text: string) => void;
  onSendPrefixChange: (prefix: string) => void;
  onToggleCharPicker: () => void;
  onExecuteEmote: (command: string) => void;
}

export function ChatArea({
  activeDmTarget,
  activeFilter,
  isSidebarOpen,
  onToggleSidebar,
  onEditFilter,
  filteredMessages,
  bannerCount,
  hasUnreadDown,
  loadOlder,
  hasMore,
  isLoadingOlder,
  messagesContainerRef,
  messagesInnerRef,
  scrollToBottomRef,
  onScroll,
  onDismissBanner,
  onScrollToBottom,
  onLinkClick,
  replyTarget,
  replyPinned,
  onReply,
  onClearReply,
  onToggleReplyPin,
  sendChannels,
  selectedSendPrefix,
  showCharPicker,
  onSend,
  onSendPrefixChange,
  onToggleCharPicker,
  onExecuteEmote,
}: Props) {
  return (
    <div className={styles['chat-area']}>
      <ChatHeader
        activeFilter={activeFilter}
        activeDmTarget={activeDmTarget}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        onEditFilter={onEditFilter}
      />

      <MessageList
        messages={filteredMessages}
        filterName={activeFilter?.name}
        disableTellRef={activeDmTarget !== null}
        bannerCount={bannerCount}
        hasUnreadDown={hasUnreadDown}
        loadOlder={loadOlder}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        messagesContainerRef={messagesContainerRef}
        messagesInnerRef={messagesInnerRef}
        scrollToBottomRef={scrollToBottomRef}
        onScroll={onScroll}
        onDismissBanner={onDismissBanner}
        onScrollToBottom={onScrollToBottom}
        onLinkClick={onLinkClick}
        onReply={onReply}
      />

      <InputArea
        sendChannels={sendChannels}
        selectedSendPrefix={selectedSendPrefix}
        showCharPicker={showCharPicker}
        onSend={onSend}
        onSendPrefixChange={onSendPrefixChange}
        onToggleCharPicker={onToggleCharPicker}
        onExecuteEmote={onExecuteEmote}
        replyTarget={replyTarget}
        replyPinned={replyPinned}
        isDmView={activeDmTarget !== null}
        onClearReply={activeDmTarget ? () => {} : onClearReply}
        onToggleReplyPin={onToggleReplyPin}
      />
    </div>
  );
}
