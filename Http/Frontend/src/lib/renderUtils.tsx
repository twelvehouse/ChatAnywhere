import type { ChatPayload } from '../types/chat';

export const urlRegex = /(https?:\/\/[^\s]+)/g;

export function renderTextWithLinks(text: string, onLinkClick: (url: string) => void) {
  if (!text) return text;
  return text.split(urlRegex).map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={part}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLinkClick(part);
          }}
          className="auto-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function renderPayloads(payloads: ChatPayload[], onLinkClick: (url: string) => void) {
  if (!payloads?.length) return null;
  return payloads.map((p, i) => {
    if (p.Type === 'icon' && p.IconId)
      return (
        <span
          key={i}
          className={`gfd-icon gfd-icon-${p.IconId}`}
          style={{ verticalAlign: 'middle', display: 'inline-block' }}
        />
      );
    return <span key={i}>{renderTextWithLinks(p.Text || '', onLinkClick)}</span>;
  });
}
