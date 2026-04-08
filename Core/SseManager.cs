using System.Collections.Concurrent;
using System.Text;
using System.Threading.Channels;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

/// <summary>
/// Manages SSE client connections and broadcasts events to all connected clients.
/// A single consumer task drains the broadcast queue in order; callers are never blocked.
/// </summary>
public sealed class SseManager : IAsyncDisposable
{
    private readonly ConcurrentDictionary<Guid, (HttpContextBase ctx, CancellationTokenSource cts)> _connections = new();
    private readonly IPluginLog _log;
    private readonly Channel<byte[]> _queue = Channel.CreateUnbounded<byte[]>(new UnboundedChannelOptions { SingleReader = true });
    private readonly Task _consumer;

    public SseManager(IPluginLog log)
    {
        _log = log;
        _consumer = Task.Run(ConsumeAsync);
    }

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
    /// Enqueues an SSE event for delivery to all connected clients.
    /// Returns immediately; the consumer task sends events in order on the thread pool.
    /// </summary>
    public void Broadcast(string eventData)
    {
        if (_connections.IsEmpty) return;
        _queue.Writer.TryWrite(Encoding.UTF8.GetBytes(eventData));
    }

    private async Task ConsumeAsync()
    {
        await foreach (var bytes in _queue.Reader.ReadAllAsync().ConfigureAwait(false))
        {
            foreach (var (id, (ctx, cts)) in _connections)
            {
                if (cts.IsCancellationRequested) { RemoveClient(id, cts); continue; }

                bool sent;
                try
                {
                    sent = await ctx.Response.SendChunk(bytes, false, cts.Token).ConfigureAwait(false);
                }
                catch { sent = false; }

                if (!sent) RemoveClient(id, cts);
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        _queue.Writer.Complete();
        await _consumer.ConfigureAwait(false);
    }

    private void RemoveClient(Guid id, CancellationTokenSource cts)
    {
        _connections.TryRemove(id, out _);
        cts.Cancel();
        _log.Debug($"[SSE] Removed disconnected client {id}. Remaining: {_connections.Count}");
    }
}
