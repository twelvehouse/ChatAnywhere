import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChannelOption } from '../../types/chat';
import { InputArea } from './InputArea';
import { useSettingsStore } from '../../store/settingsStore';
import { useSessionStore } from '../../store/sessionStore';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const channels: ChannelOption[] = [{ label: 'Say', shortLabel: 'Say', prefix: '/s ' }];

function renderInput(overrides?: Partial<Parameters<typeof InputArea>[0]>) {
  const onSend = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <InputArea
        sendChannels={channels}
        selectedSendPrefix="/s "
        showCharPicker={false}
        onSend={onSend}
        onSendPrefixChange={() => {}}
        onToggleCharPicker={() => {}}
        onExecuteEmote={() => {}}
        replyTarget={null}
        replyPinned={false}
        onClearReply={() => {}}
        onToggleReplyPin={() => {}}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onSend };
}

describe('InputArea', () => {
  beforeEach(() => {
    act(() => {
      useSettingsStore.getState().hydrate({ ctrlEnterToSend: false });
      useSessionStore.getState().setConnected(true);
    });
  });

  it('strips newline characters that appear in typed input', async () => {
    const user = userEvent.setup();
    renderInput();
    const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
    // userEvent.type interprets \n as a literal newline keypress; the change handler
    // should swallow it before reaching component state.
    await user.click(textarea);
    await user.paste('hello\nworld');
    expect(textarea.value).toBe('helloworld');
  });

  it('Enter sends the message and never inserts a newline', async () => {
    const user = userEvent.setup();
    const { onSend } = renderInput();
    const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
    await user.click(textarea);
    await user.keyboard('hi{Enter}');
    expect(onSend).toHaveBeenCalledWith('hi');
    expect(textarea.value).toBe(''); // cleared after send
  });

  it('with ctrlEnterToSend enabled, plain Enter is a no-op (no newline, no send)', async () => {
    act(() => useSettingsStore.getState().setCtrlEnterToSend(true));
    const user = userEvent.setup();
    const { onSend } = renderInput();
    const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
    await user.click(textarea);
    await user.type(textarea, 'hello');
    await user.keyboard('{Enter}');
    expect(onSend).not.toHaveBeenCalled();
    expect(textarea.value).toBe('hello');
  });
});
