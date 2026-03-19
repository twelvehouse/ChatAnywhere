using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using OpenGraphNet;
using Dalamud.Plugin.Services;
using System.Linq;
using WatsonWebserver.Core;
using WatsonWebserver.Lite;
using HttpMethod = WatsonWebserver.Core.HttpMethod;
using NetStone;
using NetStone.Search.Character;

namespace ChatAnywhere.Core;

public class WebServer : IAsyncDisposable
{
    private readonly Plugin Plugin;
    private readonly ChatSender Sender;
    private readonly ChatReceiver Receiver;
    private readonly IPluginLog Log;

    private static LodestoneClient? _lodestoneClient;
    private static readonly ConcurrentDictionary<string, string> AvatarCache = new();
    private static readonly ConcurrentDictionary<string, string> OgpCache = new();
    private static readonly HttpClient OgpHttpClient = CreateOgpHttpClient();

    private static HttpClient CreateOgpHttpClient()
    {
        var handler = new HttpClientHandler { AllowAutoRedirect = true, MaxAutomaticRedirections = 5 };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
        return client;
    }

    private static readonly HashSet<string> TwitterHosts = new(StringComparer.OrdinalIgnoreCase)
        { "x.com", "twitter.com", "www.x.com", "www.twitter.com" };

    private WebserverLite Host = null!;
    private CancellationTokenSource _tokenSource = new();

    public bool IsRunning { get; private set; }
    public int ActivePort { get; private set; }

    private readonly SseManager _sseManager;
    private volatile string _lastChannelsJson = string.Empty;
    private volatile string _currentPlayerName = string.Empty;
    private volatile string _currentPlayerWorld = string.Empty;

    private FrontendSettings _frontendSettings = new();
    private string SettingsFilePath => Path.Combine(Plugin.Interface.ConfigDirectory.FullName, "frontend-settings.json");

    public WebServer(Plugin plugin, ChatSender sender, ChatReceiver receiver, IPluginLog log)
    {
        Plugin = plugin;
        Sender = sender;
        Receiver = receiver;
        Log = log;
        _sseManager = new SseManager(log);

        Receiver.OnMessageReceived += HandleNewChatMessage;
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

            Host = new WebserverLite(new WebserverSettings("*", Plugin.Config.WebinterfacePort), DefaultRoute);

            // Setup Routes
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.OPTIONS, "/send", HandleCorsPreflight, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.POST, "/send", HandleSendMessage, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/sse", HandleSseConnection, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/history", HandleGetHistory, ExceptionRoute);
Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/channels", HandleGetChannels, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/avatar", HandleGetAvatar, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/ogp", HandleGetOgp, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.OPTIONS, "/settings", HandleCorsPreflight, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/settings", HandleGetSettings, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.PUT, "/settings", HandlePutSettings, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/files/gfdata.gfd", GetGfdData, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/files/fonticon_ps5.tex", GetTexData, ExceptionRoute);
            Host.Routes.PreAuthentication.Static.Add(HttpMethod.GET, "/files/FFXIV_Lodestone_SSF.ttf", GetLodestoneFont, ExceptionRoute);

            // Optional static frontend serving logic can be added later
            
            LoadFrontendSettings();

            Host.Events.Logger = msg => Log.Debug($"[Watson] {msg}");
            Host.Events.ExceptionEncountered += (sender, args) => Log.Error(args.Exception, "Webserver threw an exception.");

            Host.Start(_tokenSource.Token);
            IsRunning = true;
            ActivePort = Plugin.Config.WebinterfacePort;
            Log.Info($"Web server started on port {Plugin.Config.WebinterfacePort}");
        }
        catch (Exception ex)
        {
            IsRunning = false;
            Log.Error(ex, "Failed to start web server.");
        }
    }

    public void Stop()
    {
        try
        {
            _tokenSource.Cancel();
            Host?.Stop();
            IsRunning = false;
            Log.Info("Web server stopped.");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to stop web server.");
        }
    }

    public void SendActiveChannel(string prefix)
    {
        var data = new { type = "active-channel", prefix = prefix };
        var json = JsonSerializer.Serialize(data);
        _sseManager.Broadcast($"data: {json}\n\n");
    }

    /// <summary>
    /// Checks whether the channel list has changed since the last broadcast and,
    /// if so, sends the updated list to all connected SSE clients.
    /// Safe to call every frame — no-ops when nothing has changed.
    /// </summary>
    public void PollAndBroadcastChannels()
    {
        var json = GetChannelsJson();
        if (json == _lastChannelsJson) return;
        _lastChannelsJson = json;
        _sseManager.Broadcast($"data: {json}\n\n");
    }

    /// <summary>
    /// Clears the server-side chat history, resets the cached channel state,
    /// then notifies all SSE clients to clear their history and sends a fresh channel list.
    /// Called on character login.
    /// </summary>
    public void BroadcastReset()
    {
        Receiver.History.Clear();
        _lastChannelsJson = string.Empty;
        _currentPlayerName = string.Empty;
        _currentPlayerWorld = string.Empty;
        _sseManager.Broadcast("data: {\"type\":\"reset\"}\n\n");
        PollAndBroadcastChannels();
    }

    /// <summary>
    /// Broadcasts the local player's name and home world to all SSE clients.
    /// Called once LocalPlayer is confirmed non-null after login.
    /// </summary>
    public void BroadcastPlayerInfo(string name, string world)
    {
        _currentPlayerName = name;
        _currentPlayerWorld = world;
        var payload = JsonSerializer.Serialize(new { type = "player-info", name, world });
        _sseManager.Broadcast($"data: {payload}\n\n");
    }

    private void HandleNewChatMessage(ReceivedChatMessage msg)
    {
        var json = JsonSerializer.Serialize(msg);
        _sseManager.Broadcast($"data: {json}\n\n");
    }

    private async Task HandleSendMessage(HttpContextBase ctx)
    {
        try
        {
            string body = string.Empty;
            if (ctx.Request.ContentLength > 0)
            {
                var buffer = new byte[ctx.Request.ContentLength];
                var totalRead = 0;
                while (totalRead < buffer.Length)
                {
                    var read = await ctx.Request.Data.ReadAsync(buffer, totalRead, buffer.Length - totalRead);
                    if (read == 0) break;
                    totalRead += read;
                }
                body = System.Text.Encoding.UTF8.GetString(buffer, 0, totalRead);
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var payload = string.IsNullOrEmpty(body) ? null : JsonSerializer.Deserialize<SendMessagePayload>(body, options);

            if (payload != null && !string.IsNullOrWhiteSpace(payload.Message))
            {
                // Must be executed on main thread in many cases or handled safely by UIModule inside ChatSender
                _ = Plugin.Framework.RunOnTick(() =>
                {
                    Sender.SendMessage(payload.Message);
                });
                
                ctx.Response.StatusCode = 200;
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                await ctx.Response.Send("OK");
            }
            else
            {
                ctx.Response.StatusCode = 400;
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                await ctx.Response.Send("Bad Request");
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error handling /send");
            ctx.Response.StatusCode = 500;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("Internal Server Error");
        }
    }

    private async Task HandleCorsPreflight(HttpContextBase ctx)
    {
        ctx.Response.StatusCode = 200;
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        ctx.Response.Headers.Add("Access-Control-Allow-Methods", "POST, GET, PUT, OPTIONS");
        ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
        await ctx.Response.Send("OK");
    }

    private void LoadFrontendSettings()
    {
        try
        {
            if (File.Exists(SettingsFilePath))
            {
                var json = File.ReadAllText(SettingsFilePath);
                _frontendSettings = JsonSerializer.Deserialize<FrontendSettings>(json) ?? new FrontendSettings();
                Log.Debug("Frontend settings loaded.");
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to load frontend settings.");
            _frontendSettings = new FrontendSettings();
        }
    }

    private void SaveFrontendSettings()
    {
        try
        {
            var json = JsonSerializer.Serialize(_frontendSettings, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(SettingsFilePath, json);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to save frontend settings.");
        }
    }

    private async Task HandleGetSettings(HttpContextBase ctx)
    {
        var json = JsonSerializer.Serialize(_frontendSettings, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        ctx.Response.StatusCode = 200;
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send(json);
    }

    private async Task HandlePutSettings(HttpContextBase ctx)
    {
        try
        {
            string body = string.Empty;
            if (ctx.Request.ContentLength > 0)
            {
                var buffer = new byte[ctx.Request.ContentLength];
                var totalRead = 0;
                while (totalRead < buffer.Length)
                {
                    var read = await ctx.Request.Data.ReadAsync(buffer, totalRead, buffer.Length - totalRead);
                    if (read == 0) break;
                    totalRead += read;
                }
                body = System.Text.Encoding.UTF8.GetString(buffer, 0, totalRead);
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var settings = string.IsNullOrEmpty(body) ? null : JsonSerializer.Deserialize<FrontendSettings>(body, options);
            if (settings != null)
            {
                _frontendSettings = settings;
                SaveFrontendSettings();
            }

            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("OK");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error handling PUT /settings");
            ctx.Response.StatusCode = 500;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("Internal Server Error");
        }
    }

    private async Task GetLodestoneFont(HttpContextBase ctx)
    {
        var data = Plugin.FontManager.GameSymFont;
        if (data != null)
        {
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send(data);
        }
        else
        {
            ctx.Response.StatusCode = 404;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send();
        }
    }

    private async Task GetTexData(HttpContextBase ctx)
    {
        var file = Plugin.DataManager.GetFile<Lumina.Data.Files.TexFile>("common/font/fonticon_ps5.tex");
        if (file != null)
        {
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send(file.DataSpan.ToArray());
        }
        else
        {
            ctx.Response.StatusCode = 404;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send();
        }
    }

    private async Task GetGfdData(HttpContextBase ctx)
    {
        var file = Plugin.DataManager.GetFile("common/font/gfdata.gfd");
        if (file != null)
        {
            Log.Debug($"Serving gfdata.gfd: {file.Data.Length} bytes");
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send(file.Data);
        }
        else
        {
            ctx.Response.StatusCode = 404;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send();
        }
    }

    private async Task HandleSseConnection(HttpContextBase ctx)
    {
        ctx.Response.StatusCode = 200;
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        ctx.Response.Headers.Add("Content-Type", "text/event-stream");
        ctx.Response.Headers.Add("Cache-Control", "no-cache");
        ctx.Response.Headers.Add("Connection", "keep-alive");
        ctx.Response.ChunkedTransfer = true;

        var clientId = _sseManager.Register(ctx);

        try
        {
            // Initial payload to confirm connection
            await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes("data: {\"type\":\"connected\"}\n\n"), false, default);

            // Send available channels
            var channelsJson = GetChannelsJson();
            await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes($"data: {channelsJson}\n\n"), false, default);

            // Send current active channel
            var activePrefix = GetCurrentGameChannelPrefix();
            if (!string.IsNullOrEmpty(activePrefix))
            {
                var activeData = JsonSerializer.Serialize(new { type = "active-channel", prefix = activePrefix });
                await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes($"data: {activeData}\n\n"), false, default);
            }

            // Send player info if already known (e.g. on page reload after login)
            if (!string.IsNullOrEmpty(_currentPlayerName))
            {
                var playerData = JsonSerializer.Serialize(new { type = "player-info", name = _currentPlayerName, world = _currentPlayerWorld });
                await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes($"data: {playerData}\n\n"), false, default);
            }

            // Keep connection open
            while (!_tokenSource.IsCancellationRequested)
            {
                await Task.Delay(15000, _tokenSource.Token);
                await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes("data: {\"type\":\"ping\"}\n\n"), false, _tokenSource.Token);
            }
        }
        catch (TaskCanceledException) { }
        catch (Exception ex)
        {
            Log.Debug($"SSE connection ended: {ex.Message}");
        }
        finally
        {
            _sseManager.Unregister(clientId);
        }
    }

    private async Task<bool> DefaultRoute(HttpContextBase ctx)
    {
        var distRoot = Path.GetFullPath(Path.Combine(Plugin.Interface.AssemblyLocation.DirectoryName!, "dist"));
        if (!Directory.Exists(distRoot))
        {
            ctx.Response.StatusCode = 404;
            return await ctx.Response.Send("Not Found");
        }

        var rawPath = ctx.Request.Url.RawWithoutQuery.TrimStart('/');
        if (string.IsNullOrEmpty(rawPath))
            rawPath = "index.html";

        var resolved = Path.GetFullPath(Path.Combine(distRoot, rawPath));

        // Prevent path traversal outside dist
        if (!resolved.StartsWith(distRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
            && !resolved.Equals(distRoot, StringComparison.OrdinalIgnoreCase))
        {
            ctx.Response.StatusCode = 403;
            return await ctx.Response.Send("Forbidden");
        }

        // Fall back to index.html for SPA routes
        if (!File.Exists(resolved))
            resolved = Path.Combine(distRoot, "index.html");

        if (!File.Exists(resolved))
        {
            ctx.Response.StatusCode = 404;
            return await ctx.Response.Send("Not Found");
        }

        var data = await File.ReadAllBytesAsync(resolved);
        ctx.Response.StatusCode = 200;
        ctx.Response.Headers.Add("Content-Type", GetMimeType(Path.GetExtension(resolved)));
        return await ctx.Response.Send(data);
    }

    private static string GetMimeType(string ext) => ext.ToLowerInvariant() switch
    {
        ".html"         => "text/html; charset=utf-8",
        ".js"           => "application/javascript",
        ".css"          => "text/css",
        ".json"         => "application/json",
        ".png"          => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif"          => "image/gif",
        ".svg"          => "image/svg+xml",
        ".ico"          => "image/x-icon",
        ".woff"         => "font/woff",
        ".woff2"        => "font/woff2",
        ".ttf"          => "font/ttf",
        _               => "application/octet-stream",
    };

    private async Task HandleGetOgp(HttpContextBase ctx)
    {
        var urlRaw = ctx.Request.Query.Elements["url"] ?? string.Empty;
        var url = System.Net.WebUtility.UrlDecode(urlRaw);

        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        ctx.Response.Headers.Add("Content-Type", "application/json");

        if (string.IsNullOrEmpty(url) || (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.Send("{\"error\":\"invalid url\"}");
            return;
        }

        if (OgpCache.TryGetValue(url, out var cached))
        {
            ctx.Response.StatusCode = 200;
            await ctx.Response.Send(cached);
            return;
        }

        string result;
        try
        {
            var host = new Uri(url).Host;
            result = TwitterHosts.Contains(host)
                ? await FetchTwitterOEmbed(url)
                : await FetchOpenGraph(url);
        }
        catch (Exception ex)
        {
            Log.Warning(ex, $"[OGP] Failed to fetch {url}");
            result = "{\"title\":null,\"description\":null,\"image\":null,\"siteName\":null}";
        }

        OgpCache.TryAdd(url, result);
        ctx.Response.StatusCode = 200;
        await ctx.Response.Send(result);
    }

    /// <summary>
    /// Fetches OGP metadata using the OpenGraph-Net library.
    /// </summary>
    private static async Task<string> FetchOpenGraph(string url)
    {
        var graph = await OpenGraph.ParseUrlAsync(
            url,
            userAgent: "Mozilla/5.0 (compatible; ChatAnywhere/1.0)",
            timeout: 10000);

        var title       = graph.Title;
        var description = graph.Metadata.TryGetValue("og:description", out var desc) ? desc.First().Value : null;
        var image       = graph.Image?.ToString();
        var siteName    = graph.Metadata.TryGetValue("og:site_name", out var site) ? site.First().Value : null;

        // Fallback: twitter: tags
        if (string.IsNullOrEmpty(title) && graph.Metadata.TryGetValue("twitter:title", out var twTitle))
            title = twTitle.First().Value;
        if (string.IsNullOrEmpty(description) && graph.Metadata.TryGetValue("twitter:description", out var twDesc))
            description = twDesc.First().Value;
        if (string.IsNullOrEmpty(image) && graph.Metadata.TryGetValue("twitter:image", out var twImg))
            image = twImg.First().Value;

        return JsonSerializer.Serialize(new { title, description, image, siteName });
    }

    /// <summary>
    /// Twitter/X blocks standard scraping. Uses the public oEmbed API instead,
    /// which returns tweet author and text without authentication.
    /// Image is not available through oEmbed.
    /// </summary>
    private async Task<string> FetchTwitterOEmbed(string url)
    {
        var oembedUrl = $"https://publish.twitter.com/oembed?url={Uri.EscapeDataString(url)}&format=json&omit_script=true";
        var json = await OgpHttpClient.GetStringAsync(oembedUrl);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var authorName = root.TryGetProperty("author_name", out var an) ? an.GetString() : null;
        var embedHtml  = root.TryGetProperty("html", out var h) ? h.GetString() : null;

        // Extract tweet text from the <p> inside the blockquote
        string? tweetText = null;
        if (!string.IsNullOrEmpty(embedHtml))
        {
            var pMatch = Regex.Match(embedHtml, @"<p[^>]*>([\s\S]*?)</p>", RegexOptions.IgnoreCase);
            if (pMatch.Success)
            {
                tweetText = Regex.Replace(pMatch.Groups[1].Value, @"<[^>]+>", " ").Trim();
                tweetText = System.Net.WebUtility.HtmlDecode(tweetText);
            }
        }

        return JsonSerializer.Serialize(new
        {
            title       = authorName,
            description = tweetText,
            image       = (string?)null,
            siteName    = "X (Twitter)"
        });
    }

    private async Task ExceptionRoute(HttpContextBase ctx, Exception ex)
    {
        Log.Error(ex, "Unhandled route exception");
        ctx.Response.StatusCode = 500;
        await ctx.Response.Send("Internal Server Error");
    }

    public async ValueTask DisposeAsync()
    {
        Receiver.OnMessageReceived -= HandleNewChatMessage;
        await _tokenSource.CancelAsync();
        Host?.Stop();
        Host?.Dispose();
        _tokenSource.Dispose();
        IsRunning = false;
    }

    private unsafe string GetChannelsJson()
    {
        var channels = new System.Collections.Generic.List<object>();

        channels.Add(new { label = "Say",          shortLabel = "Say",    prefix = "/s "  });
        channels.Add(new { label = "Party",        shortLabel = "Party",  prefix = "/p "  });
        channels.Add(new { label = "Yell",         shortLabel = "Yell",   prefix = "/y "  });
        channels.Add(new { label = "Shout",        shortLabel = "Shout",  prefix = "/sh " });
        channels.Add(new { label = "FreeCompany",  shortLabel = "FC",     prefix = "/fc " });
        channels.Add(new { label = "Alliance",     shortLabel = "Ally",   prefix = "/a "  });
        channels.Add(new { label = "Novice Network", shortLabel = "NN",   prefix = "/n "  });

        var infoChat = FFXIVClientStructs.FFXIV.Client.UI.Info.InfoProxyChat.Instance();
        if (infoChat != null)
        {
            for (uint i = 0; i < 8; i++)
            {
                var lsNameUtf = infoChat->GetLinkShellName(i);
                if (lsNameUtf.HasValue && lsNameUtf.Length > 0)
                {
                    var name = lsNameUtf.ToString();
                    if (!string.IsNullOrEmpty(name))
                        channels.Add(new { label = $"LS{i + 1}: {name}", shortLabel = $"LS{i + 1}", prefix = $"/l{i + 1} " });
                }
            }
        }

        var cwlsProxy = FFXIVClientStructs.FFXIV.Client.UI.Info.InfoProxyCrossWorldLinkshell.Instance();
        if (cwlsProxy != null)
        {
            for (uint i = 0; i < 8; i++)
            {
                var cwlsNameUtf = cwlsProxy->GetCrossworldLinkshellName(i);
                if (cwlsNameUtf != null && cwlsNameUtf->Length > 0)
                {
                    var name = cwlsNameUtf->ToString();
                    if (!string.IsNullOrEmpty(name))
                        channels.Add(new { label = $"CWLS{i + 1}: {name}", shortLabel = $"CWLS{i + 1}", prefix = $"/cwl{i + 1} " });
                }
            }
        }

        var payload = new { type = "channels", channels = channels };
        return System.Text.Json.JsonSerializer.Serialize(payload);
    }

    /// <summary>
    /// GET /history — Returns the full chat history as a JSON array sorted by timestamp ascending.
    /// Clients call this before opening the SSE stream to restore prior messages.
    /// </summary>
    private async Task HandleGetHistory(HttpContextBase ctx)
    {
        try
        {
            var beforeParam = ctx.Request.Query.Elements["before"];
            var limitParam  = ctx.Request.Query.Elements["limit"];
            var limit  = int.TryParse(limitParam, out var l) ? Math.Clamp(l, 1, 500) : 200;
            long? before = long.TryParse(beforeParam, out var b) ? b : null;

            var history = Receiver.History.GetHistoryBefore(before, limit);
            var json = JsonSerializer.Serialize(history);
            Log.Debug($"[ChatHistory] GET /history: before={before?.ToString() ?? "null"}, limit={limit}.");
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(json);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error handling /history");
            ctx.Response.StatusCode = 500;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("Internal Server Error");
        }
    }

    private async Task HandleGetChannels(HttpContextBase ctx)
    {
        var json = GetChannelsJson();
        ctx.Response.StatusCode = 200;
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send(json);
    }

    private async Task HandleGetAvatar(HttpContextBase ctx)
    {
        var nameRaw = ctx.Request.Query.Elements["name"] ?? string.Empty;
        var worldRaw = ctx.Request.Query.Elements["world"] ?? string.Empty;

        var name = System.Net.WebUtility.UrlDecode(nameRaw);
        var world = System.Net.WebUtility.UrlDecode(worldRaw);

        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(world))
        {
            ctx.Response.StatusCode = 400;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("{\"error\":\"name and world are required\"}");
            return;
        }

        var cacheKey = $"{name}@{world}";
        if (AvatarCache.TryGetValue(cacheKey, out var cachedUrl))
        {
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send($"{{\"avatarUrl\":\"{cachedUrl}\"}}");
            return;
        }

        try
        {
            _lodestoneClient ??= await LodestoneClient.GetClientAsync();

            var searchPage = await _lodestoneClient.SearchCharacter(new CharacterSearchQuery
            {
                CharacterName = name,
                World = world,
            });

            if (searchPage == null || searchPage.Results == null)
            {
                ctx.Response.StatusCode = 200;
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                ctx.Response.Headers.Add("Content-Type", "application/json");
                await ctx.Response.Send($"{{\"avatarUrl\":\"\"}}");
                return;
            }

            var matchingEntry = searchPage.Results.FirstOrDefault(result => result.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (matchingEntry != null)
            {
                var lschar = await matchingEntry.GetCharacter();
                var avatarUrl = lschar?.Avatar?.ToString() ?? string.Empty;

                AvatarCache.TryAdd(cacheKey, avatarUrl);

                ctx.Response.StatusCode = 200;
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                ctx.Response.Headers.Add("Content-Type", "application/json");
                await ctx.Response.Send($"{{\"avatarUrl\":\"{avatarUrl}\"}}");
                return;
            }
            else
            {
                ctx.Response.StatusCode = 200;
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                ctx.Response.Headers.Add("Content-Type", "application/json");
                await ctx.Response.Send($"{{\"avatarUrl\":\"\"}}");
                return;
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to get character from Lodestone");
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send($"{{\"avatarUrl\":\"\"}}");
            return;
        }
    }

    public unsafe string GetCurrentGameChannelPrefix()
    {
        var shell = FFXIVClientStructs.FFXIV.Client.UI.Shell.RaptureShellModule.Instance();
        if (shell == null) return string.Empty;

        var type = shell->ChatType;
        
        // Manual mapping based on common FFXIV ChatType indices
        return type switch
        {
            1 => "/s ",   // Say
            2 => "/p ",   // Party
            3 => "/a ",   // Alliance
            4 => "/y ",   // Yell
            5 => "/sh ",  // Shout
            6 => "/fc ",  // FreeCompany
            8 => "/n ",   // Novice Network
            >= 9 and <= 16 => $"/cwl{type - 8} ", // CWLS
            >= 19 and <= 26 => $"/l{type - 18} ", // LS
            _ => string.Empty
        };
    }
}

public class SendMessagePayload
{
    public string Message { get; set; } = string.Empty;
}

public class FrontendSettings
{
    public string FontFamily { get; set; } = "Inter";
    public int FontSize { get; set; } = 14;
    public bool ItalicizeSystem { get; set; } = true;
    public bool UseColoredBackground { get; set; } = false;
    public List<string> DisabledChannels { get; set; } = [];
    public List<string> TrustedDomains { get; set; } = [];
    public List<CustomFilter> Filters { get; set; } = [];
    public List<FilterFolder> Folders { get; set; } = [];
}

public class CustomFilter
{
    public string Name { get; set; } = string.Empty;
    public List<int> ShowChannelTypes { get; set; } = [];
    public string? DefaultSendPrefix { get; set; } = null;
    public bool NotifyUnread { get; set; } = false;
}

public class FilterFolder
{
    public string Name { get; set; } = string.Empty;
    public List<string> Filters { get; set; } = [];
}
