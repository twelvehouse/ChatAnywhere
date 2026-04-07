using System.Collections.Concurrent;
using System.Text;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

/// <summary>
/// Manages SSE client connections and broadcasts events to all connected clients.
/// Uses ConcurrentDictionary so disconnected clients can be removed during iteration.
/// Each connection has a CancellationTokenSource; cancelling it signals the ping loop to exit.
/// </summary>
public sealed class SseManager
{
    private readonly ConcurrentDictionary<Guid, (HttpContextBase ctx, CancellationTokenSource cts)> _connections = new();
    private readonly IPluginLog _log;

    public SseManager(IPluginLog log) { _log = log; }

    public int Count => _connections.Count;

    public Guid Register(HttpContextBase ctx, CancellationTokenSource cts)
    {
        var id = Guid.NewGuid();
        _connections.TryAdd(id, (ctx, cts));
        _log.Debug($"[SSE] Client connected ({id}) from {ctx.Request.Source.IpAddress}:{ctx.Request.Source.Port}. Total: {_connections.Count}");
        return id;
    }

    public void Unregister(Guid id)
    {
        if (_connections.TryRemove(id, out _))
            _log.Debug($"[SSE] Client disconnected ({id}). Remaining: {_connections.Count}");
    }

    /// <summary>
    /// Sends an SSE event to all connected clients.
    /// SendChunk returns false instead of throwing on write failure, so we check the return value.
    /// </summary>
    public void Broadcast(string eventData)
    {
        var bytes = Encoding.UTF8.GetBytes(eventData);
        foreach (var (id, (ctx, cts)) in _connections)
        {
            if (cts.IsCancellationRequested) { RemoveClient(id, cts); continue; }

            bool sent;
            try
            {
                var task = ctx.Response.SendChunk(bytes, false, cts.Token);
                sent = task.Wait(500) && task.Result;
            }
            catch { sent = false; }

            if (!sent) RemoveClient(id, cts);
        }
    }

    private void RemoveClient(Guid id, CancellationTokenSource cts)
    {
        _connections.TryRemove(id, out _);
        cts.Cancel();
        _log.Debug($"[SSE] Removed disconnected client {id}. Remaining: {_connections.Count}");
    }
}
