using System.Text.Json;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class AuthHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly HashSet<string> _authTokens = new();
    private const string AuthCookieName = "chat-anywhere-token";

    internal AuthHandler(Plugin plugin, IPluginLog log)
    {
        _plugin = plugin;
        _log = log;
    }

    internal void AddCorsHeaders(HttpContextBase ctx)
    {
        var origin = ctx.Request.Headers["Origin"];
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", string.IsNullOrEmpty(origin) ? "*" : origin);
        ctx.Response.Headers.Add("Access-Control-Allow-Credentials", "true");
        ctx.Response.Headers.Add("Vary", "Origin");
    }

    internal async Task HandleCorsPreflight(HttpContextBase ctx)
    {
        var origin = ctx.Request.Headers["Origin"];
        ctx.Response.StatusCode = 200;
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", string.IsNullOrEmpty(origin) ? "*" : origin);
        ctx.Response.Headers.Add("Access-Control-Allow-Credentials", "true");
        ctx.Response.Headers.Add("Access-Control-Allow-Methods", "POST, GET, PUT, OPTIONS");
        ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
        ctx.Response.Headers.Add("Vary", "Origin");
        await ctx.Response.Send("OK");
    }

    internal bool IsAuthenticated(HttpContextBase ctx)
    {
        var cookieHeader = ctx.Request.Headers["Cookie"] ?? string.Empty;
        var token = HttpHelper.ExtractCookie(cookieHeader, AuthCookieName);
        return !string.IsNullOrEmpty(token) && _authTokens.Contains(token);
    }

    internal async Task<bool> RequireAuth(HttpContextBase ctx)
    {
        if (IsAuthenticated(ctx)) return true;
        ctx.Response.StatusCode = 401;
        AddCorsHeaders(ctx);
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send("{\"error\":\"unauthorized\"}");
        return false;
    }

    internal async Task HandleAuth(HttpContextBase ctx)
    {
        var storedHash = _plugin.Config.WebinterfacePasswordHash;
        if (string.IsNullOrEmpty(storedHash))
        {
            ctx.Response.StatusCode = 503;
            AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send("{\"error\":\"passcode-not-configured\"}");
            return;
        }

        var body = await HttpHelper.ReadBodyAsync(ctx, 256) ?? string.Empty;

        AuthPayload? payload = null;
        try { payload = JsonSerializer.Deserialize<AuthPayload>(body, HttpHelper.CaseInsensitiveOptions); }
        catch { /* invalid JSON → treat as wrong passcode */ }

        if (!Configuration.VerifyPasscode(payload?.Passcode ?? string.Empty, storedHash))
        {
            ctx.Response.StatusCode = 401;
            AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send("{\"error\":\"invalid-passcode\"}");
            return;
        }

        var token = Guid.NewGuid().ToString("N");
        _authTokens.Add(token);

        ctx.Response.StatusCode = 200;
        AddCorsHeaders(ctx);
        ctx.Response.Headers.Add("Set-Cookie", $"{AuthCookieName}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000");
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send("{\"ok\":true}");
    }

    internal void InvalidateAllSessions() => _authTokens.Clear();
}

internal class AuthPayload
{
    public string Passcode { get; set; } = string.Empty;
}
