using Dalamud.Plugin.Services;
using WatsonWebserver.Core;
using WatsonWebserver.Lite;
using HttpMethod = WatsonWebserver.Core.HttpMethod;

namespace ChatAnywhere.Core;

public class WebServer : IAsyncDisposable
{
    private readonly Plugin _plugin;
    private readonly ChatReceiver _receiver;
    private readonly IPluginLog _log;

    private WebserverLite _host = null!;
    private CancellationTokenSource _tokenSource = new();

    public bool IsRunning { get; private set; }
    public int ActivePort { get; private set; }

    private readonly SseManager _sseManager;
    private readonly AuthHandler _auth;
    private readonly ChatHandler _chat;
    private readonly SseHandler _sse;
    private readonly SettingsHandler _settings;
    private readonly AvatarHandler _avatar;
    private readonly OgpHandler _ogp;
    private readonly GameFileHandler _gameFiles;
    private readonly StaticFileHandler _staticFiles;

    public WebServer(Plugin plugin, ChatSender sender, ChatReceiver receiver, IPluginLog log)
    {
        _plugin = plugin;
        _receiver = receiver;
        _log = log;

        _sseManager  = new SseManager(log);
        _auth        = new AuthHandler(plugin, log);
        _chat        = new ChatHandler(plugin, log, sender, receiver, _auth);
        _sse         = new SseHandler(plugin, log, _sseManager, receiver, _auth, _chat, () => _tokenSource.Token);
        _settings    = new SettingsHandler(plugin, log, _auth);
        _avatar      = new AvatarHandler(log, _auth);
        _ogp         = new OgpHandler(log, _auth);
        _gameFiles   = new GameFileHandler(plugin, log, _auth);
        _staticFiles = new StaticFileHandler(plugin, _gameFiles);

        _receiver.OnMessageReceived += _sse.OnChatMessageReceived;
    }

    public void Start()
    {
        try
        {
            if (_tokenSource.IsCancellationRequested)
            {
                _tokenSource.Dispose();
                _tokenSource = new CancellationTokenSource();
            }

            var serverSettings = new WebserverSettings("*", _plugin.Config.WebinterfacePort);
            // Remove Watson's built-in wildcard CORS default headers — we reflect the origin per-route
            serverSettings.Headers.DefaultHeaders.Remove("Access-Control-Allow-Origin");
            serverSettings.Headers.DefaultHeaders.Remove("Access-Control-Allow-Methods");
            serverSettings.Headers.DefaultHeaders.Remove("Access-Control-Allow-Headers");
            serverSettings.Headers.DefaultHeaders.Remove("Access-Control-Expose-Headers");
            _host = new WebserverLite(serverSettings, _staticFiles.HandleDefaultRoute);

            // Setup Routes
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.OPTIONS, "/auth",     _auth.HandleCorsPreflight,        ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.POST,    "/auth",     _auth.HandleAuth,                 ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.OPTIONS, "/send",     _auth.HandleCorsPreflight,        ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.POST,    "/send",     _chat.HandleSendMessage,          ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/sse",      _sse.HandleSseConnection,         ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/history",  _chat.HandleGetHistory,           ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/channels", _chat.HandleGetChannels,          ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/avatar",   _avatar.HandleGetAvatar,          ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/ogp",      _ogp.HandleGetOgp,                ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.OPTIONS, "/settings", _auth.HandleCorsPreflight,        ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/settings", _settings.HandleGetSettings,      ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.PUT,     "/settings", _settings.HandlePutSettings,      ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/files/gfdata.gfd",              _gameFiles.GetGfdData,       ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/files/fonticon_ps5.tex",        _gameFiles.GetTexData,       ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/files/FFXIV_Lodestone_SSF.ttf", _gameFiles.GetLodestoneFont, ExceptionRoute);
            _host.Routes.PreAuthentication.Static.Add(HttpMethod.GET,     "/emotes",   _gameFiles.HandleGetEmotes,       ExceptionRoute);

            _settings.Load();

            _host.Events.Logger = msg => _log.Debug($"[Watson] {msg}");
            _host.Events.ExceptionEncountered += (sender, args) =>
            {
                // Watson throws "did not send a response" when a long-lived SSE connection ends —
                // expected behavior for SSE, not a real error.
                if (args.Exception is InvalidOperationException && args.Exception.Message.Contains("did not send a response"))
                    return;
                _log.Error(args.Exception, "Webserver threw an exception.");
            };

            _host.Start(_tokenSource.Token);
            IsRunning = true;
            ActivePort = _plugin.Config.WebinterfacePort;
            _log.Info($"Web server started on port {_plugin.Config.WebinterfacePort}");
        }
        catch (Exception ex)
        {
            IsRunning = false;
            _log.Error(ex, "Failed to start web server.");
        }
    }

    public void Stop()
    {
        try
        {
            _tokenSource.Cancel();
            _host?.Stop();
            IsRunning = false;
            _log.Info("Web server stopped.");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to stop web server.");
        }
    }

    public async ValueTask DisposeAsync()
    {
        _receiver.OnMessageReceived -= _sse.OnChatMessageReceived;
        _receiver.Dispose();
        await _tokenSource.CancelAsync().ConfigureAwait(false);
        _host?.Stop();
        _host?.Dispose();
        _tokenSource.Dispose();
        IsRunning = false;
    }

    // ── Public API delegated to handlers ────────────────────────────

    public void SendActiveChannel(string prefix)               => _sse.SendActiveChannel(prefix);
    public void PollAndBroadcastChannels()                     => _sse.PollAndBroadcastChannels();
    public void BroadcastReset()                               => _sse.BroadcastReset();
    public void BroadcastPlayerInfo(string name, string world) => _sse.BroadcastPlayerInfo(name, world);
    public void RefreshEmoteList()                             => _gameFiles.RefreshEmoteList();
    public void InvalidateAllSessions()                        => _auth.InvalidateAllSessions();
    public string GetCurrentGameChannelPrefix()                => _chat.GetCurrentGameChannelPrefix();

    // ────────────────────────────────────────────────────────────────

    private async Task ExceptionRoute(HttpContextBase ctx, Exception ex)
    {
        _log.Error(ex, "Unhandled route exception");
        ctx.Response.StatusCode = 500;
        await ctx.Response.Send("Internal Server Error");
    }
}
