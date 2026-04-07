using Dalamud.Game.Command;
using Dalamud.Interface.Windowing;
using Dalamud.Plugin;
using Dalamud.Plugin.Services;
using ChatAnywhere.Core;
using ChatAnywhere.Ui;

namespace ChatAnywhere;

public sealed class Plugin : IDalamudPlugin
{
    public string Name => "ChatAnywhere";

    public IDalamudPluginInterface Interface { get; init; }
    public IPluginLog Log { get; init; }
    public IChatGui Chat { get; init; }
    public IClientState ClientState { get; init; }
    public IObjectTable ObjectTable { get; init; }
    public IFramework Framework { get; init; }
    public IDataManager DataManager { get; init; }
    public IGameConfig GameConfig { get; init; }
    public ICommandManager CommandManager { get; init; }

    public Configuration Config { get; init; }

    public ChatReceiver Receiver { get; }
    public ChatSender Sender { get; init; }
    public FontManager FontManager { get; }
    public WebServer Server { get; init; }

    public WindowSystem WindowSystem { get; } = new("ChatAnywhere");
    public SettingsWindow SettingsWindow { get; }

    private const string CommandName = "/chatanywhere";
    private string _lastGameChannelPrefix = string.Empty;
    private DateTimeOffset _lastChannelPollTime = DateTimeOffset.MinValue;
    /// <summary>
    /// The local player's name. Set by OnFrameworkUpdate once LocalPlayer is confirmed,
    /// cleared by OnLogin. Read by WebServer from the SSE handler thread — must be volatile.
    /// </summary>
    public volatile string LocalPlayerName = string.Empty;

    /// <summary>
    /// The local player's home world. Set and cleared alongside LocalPlayerName.
    /// Read by WebServer from the SSE handler thread — must be volatile.
    /// </summary>
    public volatile string LocalPlayerWorld = string.Empty;

    public Plugin(
        IDalamudPluginInterface pluginInterface,
        IPluginLog log,
        IChatGui chat,
        IClientState clientState,
        IObjectTable objectTable,
        IFramework framework,
        IDataManager dataManager,
        IGameConfig gameConfig,
        ICommandManager commandManager)
    {
        Interface      = pluginInterface;
        Log            = log;
        Chat           = chat;
        ClientState    = clientState;
        ObjectTable    = objectTable;
        Framework      = framework;
        DataManager    = dataManager;
        GameConfig     = gameConfig;
        CommandManager = commandManager;

        Config = Interface.GetPluginConfig() as Configuration ?? new Configuration();

        Sender      = new ChatSender(Log);
        Receiver    = new ChatReceiver(Chat, ClientState, ObjectTable, Log);
        FontManager = new FontManager(Interface, Log);
        Server      = new WebServer(this, Sender, Receiver, Log);

        SettingsWindow = new SettingsWindow(this);
        WindowSystem.AddWindow(SettingsWindow);

        if (Config.WebinterfaceEnabled)
            Server.Start();

        // Build the emote list cache on the framework thread (UIState access required).
        Framework.RunOnTick(() => Server.RefreshEmoteList());

        CommandManager.AddHandler(CommandName, new CommandInfo(OnCommand)
        {
            HelpMessage = "Open ChatAnywhere settings. Use 'start' or 'stop' to control the server.",
        });

        Framework.Update  += OnFrameworkUpdate;
        ClientState.Login += OnLogin;
        Interface.UiBuilder.Draw         += WindowSystem.Draw;
        Interface.UiBuilder.OpenConfigUi += OnOpenConfigUi;
        Interface.UiBuilder.OpenMainUi   += OnOpenConfigUi;
    }

    private void OnCommand(string command, string args)
    {
        switch (args.Trim().ToLowerInvariant())
        {
            case "start":
                if (!Server.IsRunning)
                {
                    Server.Start();
                    Chat.Print("[ChatAnywhere] Server started.");
                }
                else
                {
                    Chat.Print("[ChatAnywhere] Server is already running.");
                }
                break;

            case "stop":
                if (Server.IsRunning)
                {
                    Server.Stop();
                    Chat.Print("[ChatAnywhere] Server stopped.");
                }
                else
                {
                    Chat.Print("[ChatAnywhere] Server is not running.");
                }
                break;

            case "help":
                Chat.Print("[ChatAnywhere] Commands:");
                Chat.Print("  /chatanywhere       — Toggle settings window");
                Chat.Print("  /chatanywhere start — Start the server");
                Chat.Print("  /chatanywhere stop  — Stop the server");
                break;

            default:
                SettingsWindow.IsOpen = !SettingsWindow.IsOpen;
                break;
        }
    }

    private void OnOpenConfigUi()
    {
        SettingsWindow.IsOpen = true;
    }

    private void OnFrameworkUpdate(IFramework framework)
    {
        if (!Server.IsRunning) return;

        // Sync active channel prefix on every frame (cheap string compare)
        var currentPrefix = Server.GetCurrentGameChannelPrefix();
        if (currentPrefix != _lastGameChannelPrefix)
        {
            _lastGameChannelPrefix = currentPrefix;
            if (!string.IsNullOrEmpty(currentPrefix))
                Server.SendActiveChannel(currentPrefix);
        }

        // Poll channel list once per second; broadcast only when it has changed
        var now = DateTimeOffset.UtcNow;
        if ((now - _lastChannelPollTime).TotalSeconds >= 1.0)
        {
            _lastChannelPollTime = now;
            Server.PollAndBroadcastChannels();
        }

        // Once LocalPlayer is confirmed and name is not yet stored, capture and broadcast it.
        // Covers both the post-login case and mid-session plugin startup.
        // Runs every frame until LocalPlayerName is set, then becomes a no-op.
        if (string.IsNullOrEmpty(LocalPlayerName) && ObjectTable.LocalPlayer != null)
        {
            LocalPlayerName = ObjectTable.LocalPlayer.Name.TextValue;
            LocalPlayerWorld = ObjectTable.LocalPlayer.HomeWorld.ValueNullable?.Name.ToString() ?? string.Empty;
            Server.BroadcastPlayerInfo(LocalPlayerName, LocalPlayerWorld);
        }
    }

    private void OnLogin()
    {
        if (!Server.IsRunning) return;
        LocalPlayerName = string.Empty;
        LocalPlayerWorld = string.Empty;
        Server.BroadcastReset();
        Server.RefreshEmoteList();
        // LocalPlayerName being empty re-arms the OnFrameworkUpdate check,
        // which will broadcast player info once LocalPlayer is confirmed.
    }

    public void SaveConfig()
    {
        Interface.SavePluginConfig(Config);
    }

    public void Dispose()
    {
        CommandManager.RemoveHandler(CommandName);

        Framework.Update  -= OnFrameworkUpdate;
        ClientState.Login -= OnLogin;
        Interface.UiBuilder.Draw         -= WindowSystem.Draw;
        Interface.UiBuilder.OpenConfigUi -= OnOpenConfigUi;
        Interface.UiBuilder.OpenMainUi   -= OnOpenConfigUi;

        WindowSystem.RemoveAllWindows();

        Server.DisposeAsync().AsTask().Wait();
        Receiver.Dispose();

        SaveConfig();
    }
}
