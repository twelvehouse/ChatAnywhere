import { getChannelInfo, getBadgeStyle } from '../../lib/channelUtils';
import { sanitizeName, formatTime } from '../../lib/formatUtils';
import { renderPayloads, urlRegex } from '../../lib/renderUtils';
import { AvatarImage } from './AvatarImage';
import { ImagePreview, YouTubeCard, OgpCard } from './LinkPreview';
import {
  isTrustedDomain,
  isImageUrl,
  getYouTubeId,
  getHostname,
} from '../../constants/trustedDomains';
import { TELL_INCOMING, TELL_OUTGOING } from '../../constants/channels';
import type { ChatMessage } from '../../types/chat';

function extractUrls(msg: ChatMessage): string[] {
  const urls: string[] = [];
  for (const p of msg.MessagePayloads) {
    if (p.Type === 'text' && p.Text) {
      const matches = p.Text.match(urlRegex);
      if (matches) urls.push(...matches);
    }
  }
  return urls;
}

function payloadsToText(msg: ChatMessage): string {
  return msg.MessagePayloads.filter((p) => p.Type === 'text')
    .map((p) => p.Text ?? '')
    .join('')
    .trim();
}

interface Props {
  msg: ChatMessage;
  prevMsg: ChatMessage | null;
  nextMsg: ChatMessage | null;
  tellRef: ChatMessage | null;
  onLinkClick: (url: string) => void;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  tellModeAll: boolean;
  onReply: (name: string, world?: string) => void;
  trustedDomains?: Set<string>;
}

export function MessageItem({
  msg,
  prevMsg,
  nextMsg,
  tellRef,
  onLinkClick,
  italicizeSystem,
  useColoredBackground,
  tellModeAll,
  onReply,
  trustedDomains = new Set(),
}: Props) {
  const ch = getChannelInfo(msg.Type);
  const hasAuthor = !!msg.SenderName && !ch.isSystem;

  const isSameUser =
    prevMsg && prevMsg.SenderName === msg.SenderName && prevMsg.SenderWorld === msg.SenderWorld;
  const isSameType = prevMsg && prevMsg.Type === msg.Type;
  const isWithinTime = prevMsg && msg.Timestamp - prevMsg.Timestamp < 5 * 60 * 1000;
  const isGrouped = !!(isSameUser && isSameType && isWithinTime && hasAuthor);
  const hideHeader = isGrouped || !hasAuthor || ch.label === 'Emote';

  const isNextSameUser =
    nextMsg && nextMsg.SenderName === msg.SenderName && nextMsg.SenderWorld === msg.SenderWorld;
  const isNextSameType = nextMsg && nextMsg.Type === msg.Type;
  const isNextWithinTime = nextMsg && nextMsg.Timestamp - msg.Timestamp < 5 * 60 * 1000;
  const hasNextGrouped = !!(isNextSameUser && isNextSameType && isNextWithinTime && hasAuthor);

  const isSystemContent = ch.isSystem || ch.label === 'Emote';
  const isItalic = italicizeSystem && isSystemContent;

  // tellRef is pre-computed by MessageList via history scan; hide it when header is hidden
  const activeRef = hideHeader ? null : tellRef;
  const refCh = activeRef ? getChannelInfo(activeRef.Type) : null;

  // Determine if clicking this message should trigger Tell mode
  const isTell = msg.Type === TELL_INCOMING || msg.Type === TELL_OUTGOING;
  const isClickable = isTell || (tellModeAll && hasAuthor);

  const handleClick = () => {
    if (!isClickable) return;
    if (msg.Type === TELL_OUTGOING) {
      onReply(msg.RecipientName ?? '', msg.RecipientWorld);
    } else if (msg.Type === TELL_INCOMING) {
      onReply(msg.SenderName, msg.SenderWorld);
    } else if (tellModeAll && hasAuthor) {
      onReply(msg.SenderName, msg.SenderWorld);
    }
  };

  return (
    <div
      className={`message ${hideHeader ? 'message-compact' : ''} ${hasNextGrouped ? 'message-has-next' : ''}`}
      style={{
        background: useColoredBackground ? ch.bg : undefined,
        borderLeft: `3px solid ${ch.color}44`,
        cursor: isClickable ? 'pointer' : undefined,
      }}
      onClick={handleClick}
    >
      {/* Reference row — sits above the main message row, shares left padding with avatar */}
      {activeRef && refCh && (
        <div className="tell-ref-row">
          <div className="tell-thread-ref-icon">
            <AvatarImage name={sanitizeName(activeRef.SenderName)} world={activeRef.SenderWorld} />
          </div>
          <span className="tell-thread-ref-author">{sanitizeName(activeRef.SenderName)}</span>
          <span className="tell-thread-ref-text">
            {payloadsToText(activeRef).slice(0, 60) || '…'}
          </span>
        </div>
      )}

      {/* Main message row — avatar/time-mini + body, same layout as before */}
      <div className="message-inner">
        {!hideHeader ? (
          <div className="message-avatar">
            <AvatarImage name={hasAuthor ? msg.SenderName : ''} world={msg.SenderWorld} />
          </div>
        ) : (
          <div className="message-time-mini">{formatTime(msg.Timestamp)}</div>
        )}

        <div className="message-body">
          {!hideHeader && (
            <div className="message-header">
              <span className="channel-badge" style={getBadgeStyle(ch)}>
                {ch.label}
              </span>
              {hasAuthor && (
                <span className="message-author" style={{ color: ch.color }}>
                  {sanitizeName(msg.SenderName)}
                </span>
              )}
              <span className="message-time">{formatTime(msg.Timestamp)}</span>
            </div>
          )}
          <div
            className={`message-content${isSystemContent ? ' message-content-system' : ''}${isItalic ? ' message-content-italic' : ''}`}
          >
            {renderPayloads(msg.MessagePayloads, onLinkClick)}
          </div>
          {(() => {
            const urls = extractUrls(msg);
            for (const url of urls) {
              const hostname = getHostname(url);
              if (!hostname || !isTrustedDomain(hostname, trustedDomains)) continue;
              const ytId = getYouTubeId(url);
              if (ytId) return <YouTubeCard key={url} videoId={ytId} url={url} />;
              if (isImageUrl(url)) return <ImagePreview key={url} url={url} />;
              return <OgpCard key={url} url={url} />;
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}
