using System.Text;
using System.Text.Json;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal static class HttpHelper
{
    internal static readonly JsonSerializerOptions CaseInsensitiveOptions = new() { PropertyNameCaseInsensitive = true };

    // Reads the request body up to maxBytes. Returns null if the body exceeds maxBytes.
    // Uses Content-Length to bound the read; HTTP/1.1 keep-alive connections never
    // close the socket after the body, so reading until stream-EOF would hang.
    internal static async Task<string?> ReadBodyAsync(HttpContextBase ctx, int maxBytes)
    {
        var contentLength = ctx.Request.ContentLength;
        if (contentLength <= 0)
            return string.Empty;
        if (contentLength > maxBytes)
            return null;

        using var ms = new MemoryStream((int)contentLength);
        var buf = new byte[4096];
        int remaining = (int)contentLength;
        while (remaining > 0)
        {
            int toRead = System.Math.Min(buf.Length, remaining);
            int read = await ctx.Request.Data.ReadAsync(buf, 0, toRead);
            if (read == 0) break;
            ms.Write(buf, 0, read);
            remaining -= read;
        }
        return Encoding.UTF8.GetString(ms.ToArray());
    }

    internal static string? ExtractCookie(string cookieHeader, string name)
    {
        foreach (var part in cookieHeader.Split(';'))
        {
            var trimmed = part.Trim();
            var eq = trimmed.IndexOf('=');
            if (eq < 0) continue;
            if (trimmed[..eq].Trim() == name)
                return trimmed[(eq + 1)..].Trim();
        }
        return null;
    }
}
