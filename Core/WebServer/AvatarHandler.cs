using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Dalamud.Plugin.Services;
using NetStone;
using NetStone.Search.Character;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class AvatarHandler
{
    private readonly IPluginLog _log;
    private readonly AuthHandler _auth;

    private static LodestoneClient? _lodestoneClient;
    private static readonly ConcurrentDictionary<string, string> AvatarCache = new();

    internal AvatarHandler(IPluginLog log, AuthHandler auth)
    {
        _log = log;
        _auth = auth;
    }

    internal async Task HandleGetAvatar(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        var nameRaw  = ctx.Request.Query.Elements["name"]  ?? string.Empty;
        var worldRaw = ctx.Request.Query.Elements["world"] ?? string.Empty;

        var name  = System.Net.WebUtility.UrlDecode(nameRaw);
        var world = System.Net.WebUtility.UrlDecode(worldRaw);

        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(world))
        {
            ctx.Response.StatusCode = 400;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("{\"error\":\"name and world are required\"}");
            return;
        }

        var cacheKey = $"{name}@{world}";
        if (AvatarCache.TryGetValue(cacheKey, out var cachedUrl))
        {
            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(JsonSerializer.Serialize(new { avatarUrl = cachedUrl }));
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
                _auth.AddCorsHeaders(ctx);
                ctx.Response.Headers.Add("Content-Type", "application/json");
                await ctx.Response.Send(JsonSerializer.Serialize(new { avatarUrl = string.Empty }));
                return;
            }

            var matchingEntry = searchPage.Results.FirstOrDefault(r => r.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (matchingEntry != null)
            {
                var lschar = await matchingEntry.GetCharacter();
                var avatarUrl = lschar?.Avatar?.ToString() ?? string.Empty;
                AvatarCache.TryAdd(cacheKey, avatarUrl);

                ctx.Response.StatusCode = 200;
                _auth.AddCorsHeaders(ctx);
                ctx.Response.Headers.Add("Content-Type", "application/json");
                await ctx.Response.Send(JsonSerializer.Serialize(new { avatarUrl }));
                return;
            }

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(JsonSerializer.Serialize(new { avatarUrl = string.Empty }));
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to get character from Lodestone");
            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(JsonSerializer.Serialize(new { avatarUrl = string.Empty }));
        }
    }
}
