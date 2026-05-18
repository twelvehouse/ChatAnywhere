import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppearanceSettings } from './AppearanceSettings';
import { useSettingsStore } from '../../store/settingsStore';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderWithProviders(ui: React.ReactNode) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AppearanceSettings', () => {
  beforeEach(() => {
    act(() =>
      useSettingsStore.getState().hydrate({
        fontFamily: 'Inter',
        fontSize: 14,
        italicizeSystem: true,
        useColoredBackground: false,
        largeLinkPreviews: false,
      }),
    );
  });

  it('clicking "Italicize System & Emote" toggles the setting in the store', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppearanceSettings />);

    expect(useSettingsStore.getState().italicizeSystem).toBe(true);
    await user.click(screen.getByText('Italicize System & Emote'));
    expect(useSettingsStore.getState().italicizeSystem).toBe(false);
  });

  it('typing in the font input updates fontFamily', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppearanceSettings />);

    const input = screen.getByPlaceholderText(/font name/i);
    await user.clear(input);
    await user.type(input, 'Roboto');
    expect(useSettingsStore.getState().fontFamily).toBe('Roboto');
  });
});
