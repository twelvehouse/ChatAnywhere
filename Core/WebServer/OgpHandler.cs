using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dalamud.Plugin.Services;
using OpenGraphNet;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class OgpHandler : IDisposable
{
    private readonly IPluginLog _log;
    private readonly AuthHandler _auth;

    private static readonly ConcurrentDictionary<string, string> OgpCache = new();
    private readonly HttpClient _httpClient;

    private static readonly HashSet<string> TwitterHosts = new(StringComparer.OrdinalIgnoreCase)
        { "x.com", "twitter.com", "www.x.com", "www.twitter.com" };

    internal OgpHandler(IPluginLog log, AuthHandler auth)
    {
        _log = log;
        _auth = auth;
        var handler = new HttpClientHandler { AllowAutoRedirect = true, MaxAutomaticRedirections = 5 };
        _httpClient = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
    }

    public void Dispose() => _httpClient.Dispose();

    internal async Task HandleGetOgp(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        var urlRaw = ctx.Request.Query.Elements["url"] ?? string.Empty;
        var url = System.Net.WebUtility.UrlDecode(urlRaw);

        _auth.AddCorsHeaders(ctx);
        ctx.Response.Headers.Add("Content-Type", "application/json");

        if (string.IsNullOrEmpty(url)
            || (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                && !url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.Send("{\"error\":\"invalid url\"}");
            return;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsedUri) || IsPrivateOrLocalUri(parsedUri))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.Send("{\"error\":\"url not allowed\"}");
            return;
        }

        if (OgpCache.TryGetValue(url, out var cached))
        {
            ctx.Response.StatusCode = 200;
            await ctx.Response.Send(cached);
            return;
        }

        string result;
        try
        {
            var host = new Uri(url).Host;
            result = TwitterHosts.Contains(host)
                ? await FetchTwitterOEmbed(url)
                : await FetchOpenGraph(url);
        }
        catch (Exception ex)
        {
            _log.Warning(ex, $"[OGP] Failed to fetch {url}");
            result = "{\"title\":null,\"description\":null,\"image\":null,\"siteName\":null}";
        }

        OgpCache.TryAdd(url, result);
        ctx.Response.StatusCode = 200;
        await ctx.Response.Send(result);
    }

    /// <summary>
    /// Returns true if the URI points to a loopback or private-network address
    /// that should never be fetched on the user's behalf.
    /// </summary>
    private static bool IsPrivateOrLocalUri(Uri uri)
    {
        var host = uri.Host;
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)) return true;
        if (IPAddress.TryParse(host, out var ip))
        {
            if (IPAddress.IsLoopback(ip)) return true;
            var b = ip.GetAddressBytes();
            if (b.Length == 4)
            {
                if (b[0] == 10) return true;                            // 10.0.0.0/8
                if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true; // 172.16.0.0/12
                if (b[0] == 192 && b[1] == 168) return true;            // 192.168.0.0/16
                if (b[0] == 169 && b[1] == 254) return true;            // 169.254.0.0/16 link-local
                if (b[0] == 0) return true;                             // 0.0.0.0/8
            }
        }
        return false;
    }

    /// <summary>
    /// Fetches OGP metadata using the OpenGraph-Net library.
    /// </summary>
    private static async Task<string> FetchOpenGraph(string url)
    {
        var graph = await OpenGraph.ParseUrlAsync(
            url,
            userAgent: "Mozilla/5.0 (compatible; ChatAnywhere/1.0)",
            timeout: 10000);

        var title       = graph.Title;
        var description = graph.Metadata.TryGetValue("og:description", out var desc) ? desc.First().Value : null;
        var image       = graph.Image?.ToString();
        var siteName    = graph.Metadata.TryGetValue("og:site_name", out var site) ? site.First().Value : null;

        // Fallback: twitter: tags
        if (string.IsNullOrEmpty(title) && graph.Metadata.TryGetValue("twitter:title", out var twTitle))
            title = twTitle.First().Value;
        if (string.IsNullOrEmpty(description) && graph.Metadata.TryGetValue("twitter:description", out var twDesc))
            description = twDesc.First().Value;
        if (string.IsNullOrEmpty(image) && graph.Metadata.TryGetValue("twitter:image", out var twImg))
            image = twImg.First().Value;

        return JsonSerializer.Serialize(new { title, description, image, siteName });
    }

    /// <summary>
    /// Twitter/X blocks standard scraping. Uses the public oEmbed API instead,
    /// which returns tweet author and text without authentication.
    /// Image is not available through oEmbed.
    /// </summary>
    private async Task<string> FetchTwitterOEmbed(string url)
    {
        var oembedUrl = $"https://publish.twitter.com/oembed?url={Uri.EscapeDataString(url)}&format=json&omit_script=true";
        var json = await _httpClient.GetStringAsync(oembedUrl);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var authorName = root.TryGetProperty("author_name", out var an) ? an.GetString() : null;
        var embedHtml  = root.TryGetProperty("html", out var h) ? h.GetString() : null;

        // Extract tweet text from the <p> inside the blockquote
        string? tweetText = null;
        if (!string.IsNullOrEmpty(embedHtml))
        {
            var pMatch = Regex.Match(embedHtml, @"<p[^>]*>([\s\S]*?)</p>", RegexOptions.IgnoreCase);
            if (pMatch.Success)
            {
                tweetText = Regex.Replace(pMatch.Groups[1].Value, @"<[^>]+>", " ").Trim();
                tweetText = System.Net.WebUtility.HtmlDecode(tweetText);
            }
        }

        return JsonSerializer.Serialize(new
        {
            title       = authorName,
            description = tweetText,
            image       = (string?)null,
            siteName    = "X (Twitter)"
        });
    }
}
