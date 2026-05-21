import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RELAY_ADDR } from '../../constants/config';
import { sanitizeName } from '../../lib/formatUtils';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  name: string;
  world?: string;
}

export function AvatarImage({ name, world }: Props) {
  const cleanName = sanitizeName(name);
  const enabled = !!cleanName && !!world;
  const theme = useTheme();

  const { data } = useQuery({
    queryKey: ['avatar', cleanName, world],
    queryFn: async () => {
      const r = await fetch(
        `${RELAY_ADDR}/avatar?name=${encodeURIComponent(cleanName)}&world=${encodeURIComponent(world!)}`,
        { credentials: 'include' },
      );
      if (r.status === 401) throw r;
      const json = (await r.json()) as { avatarUrl?: string };
      return json.avatarUrl || '';
    },
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const [failed, setFailed] = useState(false);
  const src = failed || !data ? theme.avatarPlaceholder : data;

  return (
    <img
      src={src}
      alt={cleanName}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      onError={() => setFailed(true)}
    />
  );
}
