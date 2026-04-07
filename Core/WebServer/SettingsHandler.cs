using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class SettingsHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly AuthHandler _auth;

    private string _settingsJson = "{}";
    private string SettingsFilePath => Path.Combine(_plugin.Interface.ConfigDirectory.FullName, "frontend-settings.json");

    internal SettingsHandler(Plugin plugin, IPluginLog log, AuthHandler auth)
    {
        _plugin = plugin;
        _log = log;
        _auth = auth;
    }

    internal void Load()
    {
        try
        {
            if (File.Exists(SettingsFilePath))
            {
                var json = File.ReadAllText(SettingsFilePath);
                JsonDocument.Parse(json).Dispose(); // validate
                _settingsJson = json;
                _log.Debug("Frontend settings loaded.");
            }
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to load frontend settings.");
            _settingsJson = "{}";
        }
    }

    private void Save()
    {
        try
        {
            File.WriteAllText(SettingsFilePath, _settingsJson);
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to save frontend settings.");
        }
    }

    internal async Task HandleGetSettings(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        ctx.Response.StatusCode = 200;
        _auth.AddCorsHeaders(ctx);
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send(_settingsJson);
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
                _settingsJson = body;
                Save();
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
