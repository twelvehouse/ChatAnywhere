using System;
using System.Collections.Concurrent;
using System.Text;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

/// <summary>
/// Manages SSE client connections and broadcasts events to all connected clients.
/// Uses ConcurrentDictionary so disconnected clients can be removed immediately.
/// </summary>
public sealed class SseManager
{
    private readonly ConcurrentDictionary<Guid, HttpContextBase> _connections = new();
    private readonly IPluginLog _log;

    public SseManager(IPluginLog log)
    {
        _log = log;
    }

    public int Count => _connections.Count;

    /// <summary>Registers a new SSE client and returns its ID for later unregistration.</summary>
    public Guid Register(HttpContextBase ctx)
    {
        var id = Guid.NewGuid();
        _connections.TryAdd(id, ctx);
        _log.Debug($"[SSE] Client connected ({id}). Total: {_connections.Count}");
        return id;
    }

    /// <summary>Removes a client by ID (call in finally block of SSE handler).</summary>
    public void Unregister(Guid id)
    {
        if (_connections.TryRemove(id, out _))
            _log.Debug($"[SSE] Client disconnected ({id}). Remaining: {_connections.Count}");
    }

    /// <summary>Sends an SSE event to all connected clients. Removes any that have disconnected.</summary>
    public void Broadcast(string eventData)
    {
        var bytes = Encoding.UTF8.GetBytes(eventData);
        foreach (var (id, ctx) in _connections)
        {
            try
            {
                ctx.Response.SendChunk(bytes, false, default).Wait(100);
            }
            catch
            {
                _connections.TryRemove(id, out _);
                _log.Debug($"[SSE] Removed disconnected client {id}");
            }
        }
    }
}
