using System;
using System.IO;
using System.Threading.Tasks;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class StaticFileHandler
{
    private readonly Plugin _plugin;
    private readonly GameFileHandler _gameFiles;

    internal StaticFileHandler(Plugin plugin, GameFileHandler gameFiles)
    {
        _plugin = plugin;
        _gameFiles = gameFiles;
    }

    internal async Task<bool> HandleDefaultRoute(HttpContextBase ctx)
    {
        var rawPath = ctx.Request.Url.RawWithoutQuery.TrimStart('/');

        // Handle /icon/{iconId} — serve emote icons from game data as PNG
        // (checked before dist, so icons work even when dist directory is absent)
        if (rawPath.StartsWith("icon/", StringComparison.Ordinal))
        {
            await _gameFiles.HandleGetIcon(ctx, rawPath[5..]);
            return true;
        }

        var distRoot = Path.GetFullPath(Path.Combine(_plugin.Interface.AssemblyLocation.DirectoryName!, "dist"));
        if (!Directory.Exists(distRoot))
        {
            ctx.Response.StatusCode = 404;
            return await ctx.Response.Send("Not Found");
        }

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
        ".html"           => "text/html; charset=utf-8",
        ".js"             => "application/javascript",
        ".css"            => "text/css",
        ".json"           => "application/json",
        ".png"            => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif"            => "image/gif",
        ".svg"            => "image/svg+xml",
        ".ico"            => "image/x-icon",
        ".woff"           => "font/woff",
        ".woff2"          => "font/woff2",
        ".ttf"            => "font/ttf",
        _                 => "application/octet-stream",
    };
}
