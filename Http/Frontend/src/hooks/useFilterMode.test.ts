import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { withQueryClient } from '../test/utils';
import { useFilterMode } from './useFilterMode';

describe('useFilterMode', () => {
  it('hydrates filterMode from the server when enabled', async () => {
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useFilterMode({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.filterMode).not.toBeNull());
    expect(result.current.filterMode?.isPersonal).toBe(false);
  });

  it('does not fetch when disabled', async () => {
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useFilterMode({ enabled: false }), { wrapper });
    expect(result.current.filterMode).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches filterMode after enablePersonalFilters succeeds', async () => {
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useFilterMode({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.filterMode).not.toBeNull());

    // Swap the GET to confirm invalidation actually triggers a refetch.
    server.use(
      http.get('/settings/filter-mode', () =>
        HttpResponse.json({
          characterKey: 'Liora Veil@Chocobo',
          isPersonal: true,
          hasExistingFile: true,
          personalFilterCharacters: ['Liora Veil@Chocobo'],
        }),
      ),
    );

    await act(() => result.current.enablePersonalFilters(true));

    await waitFor(() => expect(result.current.filterMode?.isPersonal).toBe(true));
  });
});
