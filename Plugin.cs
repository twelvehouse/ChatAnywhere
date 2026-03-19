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
    private bool _pendingPlayerInfoBroadcast = false;

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
        Config.AuthStore ??= new List<string>();

        Sender      = new ChatSender(Log);
        Receiver    = new ChatReceiver(Chat, ClientState, ObjectTable, Log);
        FontManager = new FontManager(Interface, Log);
        Server      = new WebServer(this, Sender, Receiver, Log);

        SettingsWindow = new SettingsWindow(this);
        WindowSystem.AddWindow(SettingsWindow);

        if (Config.WebinterfaceEnabled)
            Server.Start();

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

        // Broadcast player info once LocalPlayer is confirmed after login
        if (_pendingPlayerInfoBroadcast && ObjectTable.LocalPlayer != null)
        {
            _pendingPlayerInfoBroadcast = false;
            Server.BroadcastPlayerInfo(
                ObjectTable.LocalPlayer.Name.TextValue,
                ObjectTable.LocalPlayer.HomeWorld.ValueNullable?.Name.ToString() ?? string.Empty
            );
        }

        // Poll channel list once per second; broadcast only when it has changed
        var now = DateTimeOffset.UtcNow;
        if ((now - _lastChannelPollTime).TotalSeconds >= 1.0)
        {
            _lastChannelPollTime = now;
            Server.PollAndBroadcastChannels();
        }
    }

    private void OnLogin()
    {
        if (!Server.IsRunning) return;
        Server.BroadcastReset();
        _pendingPlayerInfoBroadcast = true;
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
