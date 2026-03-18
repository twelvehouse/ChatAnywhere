import { useState, useEffect } from 'react';
import { RELAY_ADDR } from '../../constants/config';
import { sanitizeName } from '../../lib/formatUtils';

const ANONYMOUS_IMG = '/assets/anonymous.png';

interface Props {
  name: string;
  world?: string;
}

export function AvatarImage({ name, world }: Props) {
  const cleanName = sanitizeName(name);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (!cleanName || !world) return ANONYMOUS_IMG;
    const cached = sessionStorage.getItem(`avatar_${cleanName}_${world}`);
    return cached !== null ? cached || ANONYMOUS_IMG : ANONYMOUS_IMG;
  });

  useEffect(() => {
    if (!cleanName || !world) return;

    const cacheKey = `avatar_${cleanName}_${world}`;
    if (sessionStorage.getItem(cacheKey) !== null) return;

    let cancelled = false;

    fetch(
      `${RELAY_ADDR}/avatar?name=${encodeURIComponent(cleanName)}&world=${encodeURIComponent(world)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const url: string = data.avatarUrl || '';
        sessionStorage.setItem(cacheKey, url);
        setAvatarUrl(url || ANONYMOUS_IMG);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [cleanName, world]);

  return (
    <img
      src={avatarUrl}
      alt={cleanName}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      onError={() => setAvatarUrl(ANONYMOUS_IMG)}
    />
  );
}
