import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChannelOption } from '../../types/chat';
import { InputArea } from './InputArea';
import { useSettingsStore } from '../../store/settingsStore';
import { useSessionStore } from '../../store/sessionStore';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const channels: ChannelOption[] = [{ label: 'Say', prefix: '/s ' }];

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
      useSettingsStore.getState().hydrate({
        ctrlEnterToSend: false,
        sendDelayEnabled: false,
        sendDelaySeconds: 3,
        sendDelayAlwaysQueue: false,
      });
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

  describe('send queue', () => {
    beforeEach(() => {
      act(() => {
        useSettingsStore.getState().hydrate({
          sendDelayEnabled: true,
          sendDelaySeconds: 3,
          sendDelayAlwaysQueue: false,
        });
      });
    });

    it('plain Enter queues the message instead of sending immediately', async () => {
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.keyboard('hi{Enter}');
      expect(onSend).not.toHaveBeenCalled();
      expect(screen.getByText('Queued')).toBeInTheDocument();
      // Text stays in the textarea while queued.
      expect(textarea.value).toBe('hi');
    });

    it('clicking the queued banner cancels the pending send', async () => {
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.keyboard('hi{Enter}');
      // Click on the "Queued" label triggers the wrapping banner button.
      await user.click(screen.getByText('Queued'));
      expect(screen.queryByText('Queued')).not.toBeInTheDocument();
      expect(onSend).not.toHaveBeenCalled();
      expect(textarea.value).toBe('hi');
    });

    it('Ctrl+Enter bypasses the queue and sends immediately', async () => {
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.type(textarea, 'hi');
      await user.keyboard('{Control>}{Enter}{/Control}');
      expect(onSend).toHaveBeenCalledWith('hi');
      expect(screen.queryByText('Queued')).not.toBeInTheDocument();
    });

    it('Send button click bypasses the queue and sends immediately', async () => {
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.type(textarea, 'hi');
      await user.click(screen.getByRole('button', { name: /^send$/i }));
      expect(onSend).toHaveBeenCalledWith('hi');
      expect(screen.queryByText('Queued')).not.toBeInTheDocument();
    });

    it('with sendDelayAlwaysQueue on, Send button also routes through the queue', async () => {
      act(() => useSettingsStore.getState().setSendDelayAlwaysQueue(true));
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.type(textarea, 'hi');
      await user.click(screen.getByRole('button', { name: /^send$/i }));
      expect(onSend).not.toHaveBeenCalled();
      expect(screen.getByText('Queued')).toBeInTheDocument();
    });

    it('with sendDelayAlwaysQueue on, Ctrl+Enter also routes through the queue', async () => {
      act(() => useSettingsStore.getState().setSendDelayAlwaysQueue(true));
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.type(textarea, 'hi');
      await user.keyboard('{Control>}{Enter}{/Control}');
      expect(onSend).not.toHaveBeenCalled();
      expect(screen.getByText('Queued')).toBeInTheDocument();
    });

    it('Escape cancels the pending send', async () => {
      const user = userEvent.setup();
      const { onSend } = renderInput();
      const textarea = screen.getByPlaceholderText(/message as/i) as HTMLTextAreaElement;
      await user.click(textarea);
      await user.keyboard('hi{Enter}');
      expect(screen.getByText('Queued')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Queued')).not.toBeInTheDocument();
      expect(onSend).not.toHaveBeenCalled();
      expect(textarea.value).toBe('hi');
    });
  });
});
