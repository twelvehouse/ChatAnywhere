import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import styles from './App.module.css';
import { addGfdStylesheet } from './lib/gfd';
import { usePaginatedHistory } from './hooks/useHistory';
import { useScrollBehavior } from './hooks/useScrollBehavior';
import { useSSE } from './hooks/useSSE';
import { useSettingsSync } from './hooks/useSettingsSync';
import { useEffectiveTheme } from './hooks/useEffectiveTheme';
import { useFilterManagement } from './hooks/useFilterManagement';
import { useAuth } from './hooks/useAuth';
import { useSettingsStore } from './store/settingsStore';
import { useSessionStore } from './store/sessionStore';
import { DEFAULT_CHANNELS, TELL_INCOMING, TELL_OUTGOING } from './constants/channels';
import { formatPlayerName, isSamePlayer } from './lib/formatUtils';
import { RELAY_ADDR } from './constants/config';
import { dispatchUnauthorized } from './lib/authEvent';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/ChatArea/ChatArea';
import { SettingsModal } from './components/Settings/SettingsModal';
import { LinkConfirmModal } from './components/Settings/LinkConfirmModal';
import { PasscodeModal } from './components/Auth/PasscodeModal';
import { useFilterMode } from './hooks/useFilterMode';
import type { ChatMessage, ChannelOption, TellPartner } from './types/chat';

function collectTellPartners(messages: ChatMessage[]): TellPartner[] {
  const seen = new Map<
    string,
    { name: string; world?: string; lastTs: number; lastMessage: ChatMessage }
  >();
  for (const msg of messages) {
    if (msg.Type !== TELL_INCOMING && msg.Type !== TELL_OUTGOING) continue;
    let partnerName: string, partnerWorld: string | undefined;
    if (msg.Type === TELL_INCOMING) {
      partnerName = msg.SenderName;
      partnerWorld = msg.SenderWorld;
    } else {
      if (!msg.RecipientName) continue;
      partnerName = msg.RecipientName;
      partnerWorld = msg.RecipientWorld;
    }
    const key = partnerWorld ? `${partnerName}@${partnerWorld}` : partnerName;
    const existing = seen.get(key);
    if (!existing || msg.Timestamp > existing.lastTs) {
      seen.set(key, {
        name: partnerName,
        world: partnerWorld,
        lastTs: msg.Timestamp,
        lastMessage: msg,
      });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.lastTs - a.lastTs)
    .map(({ name, world, lastMessage }) => ({ name, world, lastMessage }));
}

function App() {
  const { status, authenticate } = useAuth();

  if (status !== 'authenticated') {
    return <PasscodeModal status={status} onAuthenticate={authenticate} />;
  }

  return <AppContent />;
}

function AppContent() {
  // ── Core chat state ────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const isConnected = useSessionStore((s) => s.isConnected);
  const [serverChannels, setServerChannels] = useState<ChannelOption[]>(DEFAULT_CHANNELS);
  const [selectedSendPrefix, setSelectedSendPrefix] = useState(DEFAULT_CHANNELS[0].prefix);

  // ── Filter state (active selection / unread — transient) ──────
  const [activeFilterName, setActiveFilterName] = useState('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [bannerCount, setBannerCount] = useState(0);

  // ── Input state ────────────────────────────────────────────────
  const [showCharPicker, setShowCharPicker] = useState(false);

  // ── Persisted settings consumed directly in App (fields used only by deeper
  //    components read from the store there instead of being plumbed through). ──
  const {
    fontFamily,
    fontSize,
    disabledChannels,
    retainSyncSendPrefix,
    trustedDomains,
    filters,
    folders,
  } = useSettingsStore(
    useShallow((s) => ({
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      disabledChannels: s.disabledChannels,
      retainSyncSendPrefix: s.retainSyncSendPrefix,
      trustedDomains: s.trustedDomains,
      filters: s.filters,
      folders: s.folders,
    })),
  );
  const setTrustedDomains = useSettingsStore((s) => s.setTrustedDomains);
  const setFilters = useSettingsStore((s) => s.setFilters);
  const setFolders = useSettingsStore((s) => s.setFolders);

  const [showSettings, setShowSettings] = useState(false);

  // ── Sync tab prefix map (session only) ─────────────────────────
  const [syncTabPrefixMap, setSyncTabPrefixMap] = useState<Record<string, string>>({});

  // ── Last known game channel (updated by every active-channel SSE event) ──
  const lastGameChannelRef = useRef('');

  // ── Player state (lives in sessionStore — SSE writes, many readers) ──
  const localPlayerName = useSessionStore((s) => s.playerName);
  const localPlayerWorld = useSessionStore((s) => s.playerWorld);

  // ── DM view state ──────────────────────────────────────────────
  const [activeDmTarget, setActiveDmTarget] = useState<TellPartner | null>(null);

  // ── Tell mode state ────────────────────────────────────────────
  const [replyTarget, setReplyTarget] = useState<{ name: string; world?: string } | null>(null);
  const [replyPinned, setReplyPinned] = useState(false);

  // ── Link modal state ───────────────────────────────────────────
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [trustDomain, setTrustDomain] = useState(false);

  // ── Sidebar state ──────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Settings reload epoch (increments on character change) ────
  const [settingsEpoch, setSettingsEpoch] = useState(0);

  // ── Filter mode (personal vs shared) ──────────────────────────
  const { filterMode, enablePersonalFilters, disablePersonalFilters, deletePersonalFilters } =
    useFilterMode({ enabled: !!localPlayerName });

  // ── Login overlay (delayed to avoid flash on initial SSE connect) ──
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  // ── Refs for hooks ─────────────────────────────────────────────
  const activeFilterNameRef = useRef(activeFilterName);
  const filtersRef = useRef(filters);
  const styleLoaded = useRef(false);

  useEffect(() => {
    activeFilterNameRef.current = activeFilterName;
    filtersRef.current = filters;
  });

  // ── Derived state ──────────────────────────────────────────────
  const sendChannels = serverChannels.filter((c) => !disabledChannels.has(c.prefix));
  const activeFilter = activeDmTarget
    ? null
    : (filters.find((f) => f.name === activeFilterName) ?? null);

  const filteredMessages = activeDmTarget
    ? messages.filter((m) => {
        if (m.Type !== TELL_INCOMING && m.Type !== TELL_OUTGOING) return false;
        if (m.Type === TELL_INCOMING)
          return isSamePlayer(
            m.SenderName,
            m.SenderWorld,
            activeDmTarget.name,
            activeDmTarget.world,
          );
        return isSamePlayer(
          m.RecipientName ?? '',
          m.RecipientWorld,
          activeDmTarget.name,
          activeDmTarget.world,
        );
      })
    : activeFilter
      ? messages.filter((m) => activeFilter.showChannelTypes.includes(m.Type))
      : messages;

  const tellPartners = collectTellPartners(messages);

  // ── URL-driven filter selection ────────────────────────────────
  const selectFilter = (name: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('filter', name);
    history.replaceState(null, '', url.toString());
    setActiveFilterName(name);
  };

  const handleReset = () => setSettingsEpoch((n) => n + 1);

  const handleEnablePersonalFilters = async (copyFromGlobal: boolean) => {
    await enablePersonalFilters(copyFromGlobal);
    setSettingsEpoch((n) => n + 1);
  };

  const handleDisablePersonalFilters = async () => {
    await disablePersonalFilters();
    setSettingsEpoch((n) => n + 1);
  };

  useEffect(() => {
    if (isConnected && !localPlayerName) {
      const t = setTimeout(() => setShowLoginOverlay(true), 300);
      return () => {
        clearTimeout(t);
        setShowLoginOverlay(false);
      };
    }
  }, [isConnected, localPlayerName]);

  // ── Settings sync (filters/folders + initial selection) ───────
  useSettingsSync({
    refetchEpoch: settingsEpoch,
    isLoggedIn: !!localPlayerName,
    onFiltersReady: (loadedFilters) => {
      const urlFilterName = new URL(window.location.href).searchParams.get('filter');
      const targetName =
        urlFilterName && loadedFilters.some((f) => f.name === urlFilterName)
          ? urlFilterName
          : (loadedFilters[0]?.name ?? '');
      if (targetName) {
        // Update refs immediately so SSE handlers see correct values before re-render
        activeFilterNameRef.current = targetName;
        filtersRef.current = loadedFilters;

        selectFilter(targetName);
        const defaultPrefix = loadedFilters.find((f) => f.name === targetName)?.defaultSendPrefix;
        if (defaultPrefix != null) {
          setSelectedSendPrefix(defaultPrefix);
        }
      }
    },
  });

  // ── Hooks ──────────────────────────────────────────────────────
  const { loadOlder, hasMore, isLoadingOlder } = usePaginatedHistory(setMessages);

  const {
    messagesContainerRef,
    messagesInnerRef,
    scrollToBottomRef,
    isNearBottomRef,
    handleScroll,
    hasUnreadDown,
    setHasUnreadDown,
  } = useScrollBehavior({ activeFilterName, filteredMessagesLength: filteredMessages.length });

  useSSE({
    setMessages,
    setServerChannels,
    setSelectedSendPrefix,
    setUnreadMap,
    setHasUnreadDown,
    onReset: handleReset,
    isNearBottomRef,
    activeFilterNameRef,
    filtersRef,
    lastGameChannelRef,
  });

  // ── Theme class on <body> tracks the *effective* theme (system → resolved) ──
  const effectiveTheme = useEffectiveTheme();
  useEffect(() => {
    document.body.className = `theme-${effectiveTheme}`;
  }, [effectiveTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sys-font', `"${fontFamily}"`);
    document.documentElement.style.setProperty('--sys-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--sys-scale', `${fontSize / 15}`);

    const fontId = `gfont-${fontFamily.replace(/\s+/g, '')}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;500;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [fontFamily, fontSize]);

  useEffect(() => {
    if (styleLoaded.current) return;
    styleLoaded.current = true;
    addGfdStylesheet(
      `${RELAY_ADDR}/files/gfdata.gfd`,
      `${RELAY_ADDR}/files/fonticon_ps5.tex`,
    ).catch((e) => console.error('Failed to load GFD stylesheet:', e));
  }, []);

  useEffect(() => {
    const fontId = 'ffxiv-font-dynamic';
    if (!document.getElementById(fontId)) {
      const style = document.createElement('style');
      style.id = fontId;
      style.textContent = `
        @font-face {
          font-family: 'FFXIV-Lodestone';
          src: url('${RELAY_ADDR}/files/FFXIV_Lodestone_SSF.ttf') format('truetype');
          unicode-range: U+E000-F8FF;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // ── Close char picker on outside click ────────────────────────
  useEffect(() => {
    if (!showCharPicker) return;
    const handler = (e: MouseEvent) => {
      const picker = document.querySelector('[data-emote-symbol-picker]');
      if (picker && !picker.contains(e.target as Node)) {
        setShowCharPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCharPicker]);

  // ── Link handling ──────────────────────────────────────────────
  const openLink = (url: string) => {
    try {
      const { hostname } = new URL(url);
      if (trustedDomains.has(hostname)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setConfirmLink(url);
        setTrustDomain(false);
      }
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // ── Tell mode handlers ─────────────────────────────────────────
  const handleReply = (name: string, world?: string) => {
    if (
      !localPlayerName ||
      (name === localPlayerName && (!world || !localPlayerWorld || world === localPlayerWorld))
    )
      return;
    setReplyTarget({ name, world });
  };
  const handleClearReply = () => {
    setReplyTarget(null);
    setReplyPinned(false);
  };
  const handleToggleReplyPin = () => {
    setReplyPinned((v) => !v);
  };

  // ── Send message ───────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || !isConnected) return;
    const isCommand = text.startsWith('/');
    let payloadText: string;
    if (replyTarget && !isCommand) {
      payloadText = `/tell ${formatPlayerName(replyTarget.name, replyTarget.world)} ${text}`;
    } else {
      payloadText = isCommand ? text : `${selectedSendPrefix}${text}`;
    }
    if (replyTarget && !replyPinned) setReplyTarget(null);
    try {
      const res = await fetch(`${RELAY_ADDR}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Message: payloadText }),
      });
      if (res.status === 401) dispatchUnauthorized();
    } catch (e) {
      console.error('Send failed:', e);
    }
  };

  const handleExecuteEmote = (command: string) => sendMessage(command);

  // ── Sidebar filter selection ───────────────────────────────────
  const handleSelectFilter = (name: string) => {
    // Save current send prefix when leaving a sync tab (null prefix or unavailable channel)
    const currentFilter = filters.find((f) => f.name === activeFilterName);
    const currentIsSync =
      currentFilter &&
      (currentFilter.defaultSendPrefix === null ||
        !sendChannels.some((c) => c.prefix === currentFilter.defaultSendPrefix));
    if (currentIsSync) {
      setSyncTabPrefixMap((prev) => ({ ...prev, [activeFilterName]: selectedSendPrefix }));
    }

    const filter = filters.find((f) => f.name === name);
    if (filter) {
      const prefix = filter.defaultSendPrefix;
      const isAvailable = prefix !== null && sendChannels.some((c) => c.prefix === prefix);
      if (isAvailable) {
        setSelectedSendPrefix(prefix);
      } else if (retainSyncSendPrefix) {
        // Treat unavailable channel as Sync: restore saved prefix, or fall back to last game channel
        const saved = syncTabPrefixMap[name];
        if (saved !== undefined) {
          setSelectedSendPrefix(saved);
        } else if (lastGameChannelRef.current) {
          setSelectedSendPrefix(lastGameChannelRef.current);
        }
      }
    }
    setActiveDmTarget(null);
    selectFilter(name);
    setReplyTarget(null);
    setReplyPinned(false);
    setHasUnreadDown(false);
    const unread = unreadMap[name] || 0;
    if (unread > 0) {
      setBannerCount(unread);
      setUnreadMap((p) => {
        const next = { ...p };
        delete next[name];
        return next;
      });
    } else {
      setBannerCount(0);
    }
  };

  const handleSelectDm = (partner: TellPartner) => {
    setActiveDmTarget(partner);
    setActiveFilterName('');
    setReplyTarget({ name: partner.name, world: partner.world });
    setReplyPinned(true);
    setHasUnreadDown(false);
    setBannerCount(0);
    setIsSidebarOpen(false);
  };

  // ── Filter / Folder CRUD ───────────────────────────────────────
  const {
    handleAddFilter,
    handleEditFilter,
    handleDeleteFilter,
    handleAddFolder,
    handleReorderFolders,
    handleRenameFolder,
    handleDeleteFolder,
  } = useFilterManagement({
    filters,
    setFilters,
    folders,
    setFolders,
    activeFilterName,
    setUnreadMap,
    selectFilter,
  });

  return (
    <div className={styles['app-container']}>
      {showLoginOverlay && (
        <div className={styles['login-overlay']}>
          <span className={styles['login-overlay-text']}>Waiting for character login…</span>
          <div className={styles['login-overlay-dots']}>
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className={styles['sidebar-overlay']} onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        filterMode={filterMode}
        filters={filters}
        folders={folders}
        activeFilterName={activeFilterName}
        unreadMap={unreadMap}
        tellPartners={tellPartners}
        activeDmTarget={activeDmTarget}
        onSelectFilter={handleSelectFilter}
        onSelectDm={handleSelectDm}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setShowSettings(true)}
        onAddFilter={handleAddFilter}
        onEditFilter={handleEditFilter}
        onDeleteFilter={handleDeleteFilter}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onReorderFolders={handleReorderFolders}
        onEnablePersonalFilters={handleEnablePersonalFilters}
        onDisablePersonalFilters={handleDisablePersonalFilters}
      />

      <ChatArea
        activeDmTarget={activeDmTarget}
        activeFilter={activeFilter}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        filteredMessages={filteredMessages}
        bannerCount={bannerCount}
        hasUnreadDown={hasUnreadDown}
        loadOlder={loadOlder}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        messagesContainerRef={messagesContainerRef}
        messagesInnerRef={messagesInnerRef}
        scrollToBottomRef={scrollToBottomRef}
        onScroll={handleScroll}
        onDismissBanner={() => setBannerCount(0)}
        onScrollToBottom={() => {
          scrollToBottomRef.current?.();
          setHasUnreadDown(false);
        }}
        onLinkClick={openLink}
        sendChannels={sendChannels}
        selectedSendPrefix={selectedSendPrefix}
        showCharPicker={showCharPicker}
        onSend={sendMessage}
        onSendPrefixChange={setSelectedSendPrefix}
        onToggleCharPicker={() => setShowCharPicker((o) => !o)}
        onExecuteEmote={handleExecuteEmote}
        onEditFilter={handleEditFilter}
        replyTarget={replyTarget}
        replyPinned={replyPinned}
        onReply={handleReply}
        onClearReply={handleClearReply}
        onToggleReplyPin={handleToggleReplyPin}
      />

      {showSettings && (
        <SettingsModal
          serverChannels={serverChannels}
          selectedSendPrefix={selectedSendPrefix}
          setSelectedSendPrefix={setSelectedSendPrefix}
          filterMode={filterMode}
          onDeletePersonalFilters={deletePersonalFilters}
          onClose={() => setShowSettings(false)}
        />
      )}

      {confirmLink && (
        <LinkConfirmModal
          confirmLink={confirmLink}
          trustDomain={trustDomain}
          setTrustDomain={setTrustDomain}
          setTrustedDomains={setTrustedDomains}
          onClose={() => setConfirmLink(null)}
        />
      )}
    </div>
  );
}

export default App;
