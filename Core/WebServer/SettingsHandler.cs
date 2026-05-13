using System.Text.Json;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class SettingsHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly AuthHandler _auth;

    private string GlobalSettingsPath =>
        Path.Combine(_plugin.Interface.ConfigDirectory.FullName, "frontend-settings.json");

    internal SettingsHandler(Plugin plugin, IPluginLog log, AuthHandler auth)
    {
        _plugin = plugin;
        _log = log;
        _auth = auth;
    }

    private string CharacterSettingsPath(string name, string world) =>
        Path.Combine(_plugin.Interface.ConfigDirectory.FullName, $"{name}@{world}.json");

    // Prefers character-specific file when logged in; falls back to the global file.
    private string GetReadPath()
    {
        var name = _plugin.LocalPlayerName;
        var world = _plugin.LocalPlayerWorld;
        if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(world))
        {
            var charPath = CharacterSettingsPath(name, world);
            if (File.Exists(charPath)) return charPath;
        }
        return GlobalSettingsPath;
    }

    // Uses a character-specific file when logged in; otherwise uses the global file.
    private string GetSavePath()
    {
        var name = _plugin.LocalPlayerName;
        var world = _plugin.LocalPlayerWorld;
        return !string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(world)
            ? CharacterSettingsPath(name, world)
            : GlobalSettingsPath;
    }

    internal async Task HandleGetSettings(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var path = GetReadPath();
            var json = File.Exists(path) ? await File.ReadAllTextAsync(path) : "{}";

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(json);
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to read frontend settings.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandlePutSettings(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var body = await HttpHelper.ReadBodyAsync(ctx, 65_536);
            if (body == null)
            {
                ctx.Response.StatusCode = 413;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("Request body too large");
                return;
            }

            if (!string.IsNullOrEmpty(body))
            {
                JsonDocument.Parse(body).Dispose(); // validate JSON before storing
                await File.WriteAllTextAsync(GetSavePath(), body);
            }

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("OK");
        }
        catch (JsonException)
        {
            ctx.Response.StatusCode = 400;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Invalid JSON");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Error handling PUT /settings");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }
}
