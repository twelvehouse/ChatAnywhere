using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class SseHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly SseManager _sseManager;
    private readonly ChatReceiver _receiver;
    private readonly AuthHandler _auth;
    private readonly ChatHandler _chat;
    private readonly Func<CancellationToken> _getToken;

    private volatile string _lastChannelsJson = string.Empty;

    internal SseHandler(
        Plugin plugin,
        IPluginLog log,
        SseManager sseManager,
        ChatReceiver receiver,
        AuthHandler auth,
        ChatHandler chat,
        Func<CancellationToken> getToken)
    {
        _plugin = plugin;
        _log = log;
        _sseManager = sseManager;
        _receiver = receiver;
        _auth = auth;
        _chat = chat;
        _getToken = getToken;
    }

    internal void OnChatMessageReceived(ReceivedChatMessage msg)
    {
        var json = JsonSerializer.Serialize(msg);
        _sseManager.Broadcast($"data: {json}\n\n");
    }

    internal void SendActiveChannel(string prefix)
    {
        var json = JsonSerializer.Serialize(new { type = "active-channel", prefix });
        _sseManager.Broadcast($"data: {json}\n\n");
    }

    /// <summary>
    /// Checks whether the channel list has changed since the last broadcast and,
    /// if so, sends the updated list to all connected SSE clients.
    /// Safe to call every frame — no-ops when nothing has changed.
    /// </summary>
    internal void PollAndBroadcastChannels()
    {
        var json = _chat.GetChannelsJson();
        if (json == _lastChannelsJson) return;
        _lastChannelsJson = json;
        _sseManager.Broadcast($"data: {json}\n\n");
    }

    /// <summary>
    /// Clears the server-side chat history, resets the cached channel state,
    /// then notifies all SSE clients to clear their history and sends a fresh channel list.
    /// Called on character login.
    /// </summary>
    internal void BroadcastReset()
    {
        _receiver.History.Clear();
        _lastChannelsJson = string.Empty;
        _sseManager.Broadcast("data: {\"type\":\"reset\"}\n\n");
        PollAndBroadcastChannels();
    }

    /// <summary>
    /// Broadcasts the local player's name and home world to all SSE clients.
    /// Called once LocalPlayer is confirmed non-null after login.
    /// </summary>
    internal void BroadcastPlayerInfo(string name, string world)
    {
        var payload = JsonSerializer.Serialize(new { type = "player-info", name, world });
        _sseManager.Broadcast($"data: {payload}\n\n");
    }

    internal async Task HandleSseConnection(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        ctx.Response.StatusCode = 200;
        _auth.AddCorsHeaders(ctx);
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
            var channelsJson = _chat.GetChannelsJson();
            await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes($"data: {channelsJson}\n\n"), false, default);

            // Send current active channel
            var activePrefix = _chat.GetCurrentGameChannelPrefix();
            if (!string.IsNullOrEmpty(activePrefix))
            {
                var activeData = JsonSerializer.Serialize(new { type = "active-channel", prefix = activePrefix });
                await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes($"data: {activeData}\n\n"), false, default);
            }

            // Send player info if the local player is already known (e.g. on page reload or mid-session connect)
            if (!string.IsNullOrEmpty(_plugin.LocalPlayerName))
            {
                var playerData = JsonSerializer.Serialize(new { type = "player-info", name = _plugin.LocalPlayerName, world = _plugin.LocalPlayerWorld });
                await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes($"data: {playerData}\n\n"), false, default);
            }

            // Keep connection open
            var token = _getToken();
            while (!token.IsCancellationRequested)
            {
                await Task.Delay(15000, token);
                await ctx.Response.SendChunk(System.Text.Encoding.UTF8.GetBytes("data: {\"type\":\"ping\"}\n\n"), false, token);
            }
        }
        catch (TaskCanceledException) { }
        catch (Exception ex)
        {
            _log.Debug($"SSE connection ended: {ex.Message}");
        }
        finally
        {
            _sseManager.Unregister(clientId);
        }
    }
}
