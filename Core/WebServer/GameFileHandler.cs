using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class GameFileHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly AuthHandler _auth;

    // Cached emote list JSON, built on the game framework thread and served to HTTP clients.
    private volatile string _cachedEmoteJson = "{\"emotes\":[]}";

    internal GameFileHandler(Plugin plugin, IPluginLog log, AuthHandler auth)
    {
        _plugin = plugin;
        _log = log;
        _auth = auth;
    }

    internal async Task GetLodestoneFont(HttpContextBase ctx)
    {
        var data = _plugin.FontManager.GameSymFont;
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

    internal async Task GetTexData(HttpContextBase ctx)
    {
        var file = _plugin.DataManager.GetFile<Lumina.Data.Files.TexFile>("common/font/fonticon_ps5.tex");
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

    internal async Task GetGfdData(HttpContextBase ctx)
    {
        var file = _plugin.DataManager.GetFile("common/font/gfdata.gfd");
        if (file != null)
        {
            _log.Debug($"Serving gfdata.gfd: {file.Data.Length} bytes");
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

    /// <summary>
    /// Builds the emote list from game data and caches it as JSON.
    /// Must be called on the game framework thread (UIState access).
    /// </summary>
    internal unsafe void RefreshEmoteList()
    {
        try
        {
            var sheet = _plugin.DataManager.GetExcelSheet<Lumina.Excel.Sheets.Emote>(_plugin.ClientState.ClientLanguage);
            if (sheet == null) { _log.Warning("[Emotes] Sheet not available."); return; }

            var uiState = FFXIVClientStructs.FFXIV.Client.Game.UI.UIState.Instance();
            var entries = new List<object>();

            foreach (var row in sheet)
            {
                var name    = row.Name.ToString();
                var command = row.TextCommand.Value.Command.ToString();

                if (row.Icon == 0 || string.IsNullOrEmpty(name) || string.IsNullOrEmpty(command))
                    continue;

                var isOwned = row.UnlockLink == 0 || (uiState != null && uiState->IsUnlockLinkUnlocked(row.UnlockLink));
                entries.Add(new { id = (int)row.RowId, name, command, iconId = (int)row.Icon, isOwned });
            }

            _cachedEmoteJson = JsonSerializer.Serialize(new { emotes = entries });
            _log.Info($"[Emotes] Cached {entries.Count} emotes.");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "[Emotes] Failed to refresh emote list.");
        }
    }

    internal async Task HandleGetEmotes(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        ctx.Response.StatusCode = 200;
        _auth.AddCorsHeaders(ctx);
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send(_cachedEmoteJson);
    }

    internal async Task HandleGetIcon(HttpContextBase ctx, string iconIdStr)
    {
        if (!int.TryParse(iconIdStr, out var iconId) || iconId <= 0)
        {
            ctx.Response.StatusCode = 400;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("Bad Request");
            return;
        }

        try
        {
            var folder  = (iconId / 1000) * 1000;
            var texPath = $"ui/icon/{folder:D6}/{iconId:D6}_hr1.tex";
            var file    = _plugin.DataManager.GetFile<Lumina.Data.Files.TexFile>(texPath);

            if (file == null)
            {
                ctx.Response.StatusCode = 404;
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                await ctx.Response.Send("Not Found");
                return;
            }

            var bgra   = file.ImageData; // BGRA byte order (B8G8R8A8)
            var width  = file.Header.Width;
            var height = file.Header.Height;
            var png    = PngEncoder.Encode(bgra, width, height);

            ctx.Response.StatusCode = 200;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            ctx.Response.Headers.Add("Content-Type", "image/png");
            ctx.Response.Headers.Add("Cache-Control", "public, max-age=86400");
            await ctx.Response.Send(png);
        }
        catch (Exception ex)
        {
            _log.Error(ex, $"[Icon] Failed to serve icon {iconId}.");
            ctx.Response.StatusCode = 500;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            await ctx.Response.Send("Internal Server Error");
        }
    }
}
