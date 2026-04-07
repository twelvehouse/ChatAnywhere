import { useState, useEffect } from 'react';
import styles from './LinkPreview.module.css';
import { RELAY_ADDR } from '../../constants/config';

// Module-level cache to avoid re-fetching the same URL across re-renders
const ogpCache = new Map<string, OgpData | 'loading' | 'error'>();

interface OgpData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface OgpCardProps {
  url: string;
}

function ExternalLinkIcon() {
  return (
    <svg
      className={styles['ogp-external-icon']}
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function OgpCard({ url }: OgpCardProps) {
  const [data, setData] = useState<OgpData | 'loading' | 'error'>(
    () => ogpCache.get(url) ?? 'loading',
  );

  useEffect(() => {
    const cached = ogpCache.get(url);
    if (cached && cached !== 'loading') return;

    ogpCache.set(url, 'loading');
    fetch(`${RELAY_ADDR}/ogp?url=${encodeURIComponent(url)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: OgpData) => {
        const result = d.title || d.image ? d : 'error';
        ogpCache.set(url, result);
        setData(result);
      })
      .catch(() => {
        ogpCache.set(url, 'error');
        setData('error');
      });
  }, [url]);

  if (data === 'loading') {
    return (
      <div className={styles['ogp-card']}>
        <div className={styles['ogp-skeleton']} />
      </div>
    );
  }
  if (data === 'error' || typeof data === 'string') return null;

  const { title, description, image, siteName } = data;
  if (!title && !image) return null;

  return (
    <a
      href={url}
      className={styles['ogp-card']}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
      }}
    >
      <div className={styles['ogp-body']}>
        {siteName && (
          <span className={styles['ogp-site']}>
            {siteName}
            <ExternalLinkIcon />
          </span>
        )}
        {title && <span className={styles['ogp-title']}>{title}</span>}
        {description && <span className={styles['ogp-desc']}>{description}</span>}
      </div>
      {image && (
        <div className={styles['ogp-image-wrapper']}>
          <img
            src={image}
            alt=""
            className={styles['ogp-image']}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement)
                .closest(`.${styles['ogp-image-wrapper']}`)
                ?.remove();
            }}
          />
        </div>
      )}
    </a>
  );
}

interface ImagePreviewProps {
  url: string;
}

export function ImagePreview({ url }: ImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className={styles.preview}>
      <img src={url} alt="" className={styles['preview-image']} onError={() => setFailed(true)} />
    </div>
  );
}

interface YouTubeCardProps {
  videoId: string;
  url: string;
}

export function YouTubeCard({ videoId, url }: YouTubeCardProps) {
  const [loaded, setLoaded] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (loaded) {
    return (
      <div className={`${styles['ogp-card']} ${styles['ogp-card-youtube-embed']}`}>
        <div className={styles['youtube-wrapper']}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="YouTube video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles['ogp-card']}>
      <div className={styles['ogp-body']}>
        <span className={styles['ogp-site']}>
          YouTube
          <ExternalLinkIcon />
        </span>
      </div>
      <button
        type="button"
        className={styles['ogp-image-wrapper']}
        onClick={(e) => {
          e.stopPropagation();
          setLoaded(true);
        }}
        aria-label="Play YouTube video"
      >
        <img src={thumbnailUrl} alt="YouTube thumbnail" className={styles['ogp-image']} />
        <div className={styles['youtube-play']}>
          <svg viewBox="0 0 68 48" width="68" height="48">
            <path
              d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
              fill="#f00"
            />
            <path d="M45 24 27 14v20" fill="#fff" />
          </svg>
        </div>
      </button>
      <a
        href={url}
        className={styles['youtube-open-link']}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
        aria-label="Open in YouTube"
      >
        Open in YouTube
        <ExternalLinkIcon />
      </a>
    </div>
  );
}
