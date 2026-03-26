import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './App.module.css';
import { addGfdStylesheet } from './lib/gfd';
import { usePaginatedHistory } from './hooks/useHistory';
import { useScrollBehavior } from './hooks/useScrollBehavior';
import { useSSE } from './hooks/useSSE';
import { useSettingsSync } from './hooks/useSettingsSync';
import { useFilterManagement } from './hooks/useFilterManagement';
import { DEFAULT_CHANNELS } from './constants/channels';
import { RELAY_ADDR } from './constants/config';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/ChatArea/ChatArea';
import { SettingsModal } from './components/Settings/SettingsModal';
import { LinkConfirmModal } from './components/Settings/LinkConfirmModal';
import type { ChatMessage, ChannelOption } from './types/chat';
import type { CustomFilter, FilterFolder } from './types/filter';

function App() {
  // ── Core chat state ────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [serverChannels, setServerChannels] = useState<ChannelOption[]>(DEFAULT_CHANNELS);
  const [selectedSendPrefix, setSelectedSendPrefix] = useState(DEFAULT_CHANNELS[0].prefix);

  // ── Filter state ───────────────────────────────────────────────
  const [filters, setFilters] = useState<CustomFilter[]>([]);
  const [folders, setFolders] = useState<FilterFolder[]>([]);
  const [activeFilterName, setActiveFilterName] = useState('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [bannerCount, setBannerCount] = useState(0);

  // ── Input state ────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [showCharPicker, setShowCharPicker] = useState(false);

  // ── Settings state ─────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(14);
  const [disabledChannels, setDisabledChannels] = useState<Set<string>>(new Set());
  const [italicizeSystem, setItalicizeSystem] = useState(true);
  const [useColoredBackground, setUseColoredBackground] = useState(false);
  const [tellModeAll, setTellModeAll] = useState(true);
  const [ctrlEnterToSend, setCtrlEnterToSend] = useState(false);
  const [emoteConfirm, setEmoteConfirm] = useState(true);
  const [retainSyncSendPrefix, setRetainSyncSendPrefix] = useState(true);

  // ── Sync tab prefix map (session only) ─────────────────────────
  const [syncTabPrefixMap, setSyncTabPrefixMap] = useState<Record<string, string>>({});

  // ── Player state ───────────────────────────────────────────────
  const [localPlayerName, setLocalPlayerName] = useState('');
  const [localPlayerWorld, setLocalPlayerWorld] = useState('');

  // ── Tell mode state ────────────────────────────────────────────
  const [replyTarget, setReplyTarget] = useState<{ name: string; world?: string } | null>(null);
  const [replyPinned, setReplyPinned] = useState(false);

  // ── Link modal state ───────────────────────────────────────────
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [trustDomain, setTrustDomain] = useState(false);
  const [trustedDomains, setTrustedDomains] = useState<Set<string>>(new Set());

  // ── Sidebar state ──────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const activeFilter = filters.find((f) => f.name === activeFilterName) ?? null;
  const filteredMessages = activeFilter
    ? messages.filter((m) => activeFilter.showChannelTypes.includes(m.Type))
    : messages;

  // ── URL-driven filter selection ────────────────────────────────
  const selectFilter = (name: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('filter', name);
    history.replaceState(null, '', url.toString());
    setActiveFilterName(name);
  };

  // ── Settings sync (filters/folders + initial selection) ───────
  useSettingsSync({
    fontFamily,
    fontSize,
    italicizeSystem,
    useColoredBackground,
    disabledChannels,
    trustedDomains,
    filters,
    folders,
    tellModeAll,
    ctrlEnterToSend,
    emoteConfirm,
    retainSyncSendPrefix,
    setFontFamily,
    setFontSize,
    setItalicizeSystem,
    setUseColoredBackground,
    setDisabledChannels,
    setTrustedDomains,
    setFilters,
    setFolders,
    setTellModeAll,
    setCtrlEnterToSend,
    setEmoteConfirm,
    setRetainSyncSendPrefix,
    onFiltersReady: (loadedFilters) => {
      const urlFilterName = new URL(window.location.href).searchParams.get('filter');
      const targetName =
        urlFilterName && loadedFilters.some((f) => f.name === urlFilterName)
          ? urlFilterName
          : (loadedFilters[0]?.name ?? '');
      if (targetName) selectFilter(targetName);
    },
  });

  // ── Hooks ──────────────────────────────────────────────────────
  const { loadOlder, hasMore, isLoadingOlder } = usePaginatedHistory(setMessages);

  const {
    messagesContainerRef,
    scrollToBottomRef,
    isNearBottomRef,
    handleScroll,
    hasUnreadDown,
    setHasUnreadDown,
  } = useScrollBehavior({ activeFilterName, filteredMessagesLength: filteredMessages.length });

  useSSE({
    setIsConnected,
    setMessages,
    setServerChannels,
    setSelectedSendPrefix,
    setUnreadMap,
    setHasUnreadDown,
    setLocalPlayerName,
    setLocalPlayerWorld,
    isNearBottomRef,
    activeFilterNameRef,
    filtersRef,
  });

  // ── Font effects ───────────────────────────────────────────────
  useEffect(() => {
    document.body.className = 'theme-dark';
  }, []);

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
      const target = replyTarget.world
        ? `${replyTarget.name}@${replyTarget.world}`
        : replyTarget.name;
      payloadText = `/tell ${target} ${text}`;
    } else {
      payloadText = isCommand ? text : `${selectedSendPrefix}${text}`;
    }
    setInputText('');
    if (replyTarget && !replyPinned) setReplyTarget(null);
    try {
      await fetch(`${RELAY_ADDR}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Message: payloadText }),
      });
    } catch (e) {
      console.error('Send failed:', e);
    }
  };

  const handleExecuteEmote = (command: string) => sendMessage(command);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (ctrlEnterToSend && !e.ctrlKey) return;
      e.preventDefault();
      sendMessage(inputText);
    }
  };

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
        // Treat unavailable channel as Sync: restore saved prefix if available
        const saved = syncTabPrefixMap[name];
        if (saved !== undefined) setSelectedSendPrefix(saved);
      }
    }
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
      {isSidebarOpen && (
        <div className={styles['sidebar-overlay']} onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        isConnected={isConnected}
        filters={filters}
        folders={folders}
        activeFilterName={activeFilterName}
        unreadMap={unreadMap}
        onSelectFilter={handleSelectFilter}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setShowSettings(true)}
        onAddFilter={handleAddFilter}
        onEditFilter={handleEditFilter}
        onDeleteFilter={handleDeleteFilter}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onReorderFolders={handleReorderFolders}
      />

      <ChatArea
        activeFilter={activeFilter}
        filters={filters}
        folders={folders}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        filteredMessages={filteredMessages}
        isConnected={isConnected}
        bannerCount={bannerCount}
        hasUnreadDown={hasUnreadDown}
        loadOlder={loadOlder}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        messagesContainerRef={messagesContainerRef}
        scrollToBottomRef={scrollToBottomRef}
        onScroll={handleScroll}
        onDismissBanner={() => setBannerCount(0)}
        onScrollToBottom={() => {
          scrollToBottomRef.current?.();
          setHasUnreadDown(false);
        }}
        onLinkClick={openLink}
        italicizeSystem={italicizeSystem}
        useColoredBackground={useColoredBackground}
        inputText={inputText}
        sendChannels={sendChannels}
        selectedSendPrefix={selectedSendPrefix}
        showCharPicker={showCharPicker}
        onInputChange={setInputText}
        onSendPrefixChange={setSelectedSendPrefix}
        onKeyDown={handleKeyDown}
        onSendClick={() => sendMessage(inputText)}
        onToggleCharPicker={() => setShowCharPicker((o) => !o)}
        onExecuteEmote={handleExecuteEmote}
        emoteConfirm={emoteConfirm}
        onEditFilter={handleEditFilter}
        replyTarget={replyTarget}
        replyPinned={replyPinned}
        tellModeAll={tellModeAll}
        onReply={handleReply}
        onClearReply={handleClearReply}
        onToggleReplyPin={handleToggleReplyPin}
        trustedDomains={trustedDomains}
      />

      {showSettings && (
        <SettingsModal
          fontFamily={fontFamily}
          fontSize={fontSize}
          italicizeSystem={italicizeSystem}
          useColoredBackground={useColoredBackground}
          setFontFamily={setFontFamily}
          setFontSize={setFontSize}
          setItalicizeSystem={setItalicizeSystem}
          setUseColoredBackground={setUseColoredBackground}
          serverChannels={serverChannels}
          disabledChannels={disabledChannels}
          selectedSendPrefix={selectedSendPrefix}
          setDisabledChannels={setDisabledChannels}
          setSelectedSendPrefix={setSelectedSendPrefix}
          trustedDomains={trustedDomains}
          setTrustedDomains={setTrustedDomains}
          tellModeAll={tellModeAll}
          setTellModeAll={setTellModeAll}
          ctrlEnterToSend={ctrlEnterToSend}
          setCtrlEnterToSend={setCtrlEnterToSend}
          emoteConfirm={emoteConfirm}
          setEmoteConfirm={setEmoteConfirm}
          retainSyncSendPrefix={retainSyncSendPrefix}
          setRetainSyncSendPrefix={setRetainSyncSendPrefix}
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
