using System.Text.Json;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class ChatHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly ChatSender _sender;
    private readonly ChatReceiver _receiver;
    private readonly AuthHandler _auth;

    internal ChatHandler(Plugin plugin, IPluginLog log, ChatSender sender, ChatReceiver receiver, AuthHandler auth)
    {
        _plugin = plugin;
        _log = log;
        _sender = sender;
        _receiver = receiver;
        _auth = auth;
    }

    internal async Task HandleSendMessage(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var body = await HttpHelper.ReadBodyAsync(ctx, 4096);
            if (body == null)
            {
                ctx.Response.StatusCode = 400;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("Request body too large");
                return;
            }

            var payload = string.IsNullOrEmpty(body) ? null : JsonSerializer.Deserialize<SendMessagePayload>(body, HttpHelper.CaseInsensitiveOptions);

            if (payload != null && !string.IsNullOrWhiteSpace(payload.Message))
            {
                // Must be executed on main thread in many cases or handled safely by UIModule inside ChatSender
                _ = _plugin.Framework.RunOnTick(() =>
                {
                    _sender.SendMessage(payload.Message);
                });

                ctx.Response.StatusCode = 200;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("OK");
            }
            else
            {
                ctx.Response.StatusCode = 400;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("Bad Request");
            }
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Error handling /send");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    /// <summary>
    /// GET /history — Returns the full chat history as a JSON array sorted by timestamp ascending.
    /// Clients call this before opening the SSE stream to restore prior messages.
    /// </summary>
    internal async Task HandleGetHistory(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var beforeParam = ctx.Request.Query.Elements["before"];
            var limitParam  = ctx.Request.Query.Elements["limit"];
            var limit  = int.TryParse(limitParam, out var l) ? Math.Clamp(l, 1, 500) : 200;
            long? before = long.TryParse(beforeParam, out var b) ? b : null;

            var history = _receiver.History.GetHistoryBefore(before, limit);
            var json = JsonSerializer.Serialize(history);
            _log.Debug($"[ChatHistory] GET /history: before={before?.ToString() ?? "null"}, limit={limit}.");
            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(json);
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Error handling /history");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandleGetChannels(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        var json = GetChannelsJson();
        ctx.Response.StatusCode = 200;
        _auth.AddCorsHeaders(ctx);
        ctx.Response.Headers.Add("Content-Type", "application/json");
        await ctx.Response.Send(json);
    }

    internal unsafe string GetChannelsJson()
    {
        var channels = new List<object>();

        channels.Add(new { label = "Say",            shortLabel = "Say",   prefix = "/s "  });
        channels.Add(new { label = "Party",          shortLabel = "Party", prefix = "/p "  });
        channels.Add(new { label = "Yell",           shortLabel = "Yell",  prefix = "/y "  });
        channels.Add(new { label = "Shout",          shortLabel = "Shout", prefix = "/sh " });
        channels.Add(new { label = "FreeCompany",    shortLabel = "FC",    prefix = "/fc " });
        channels.Add(new { label = "Alliance",       shortLabel = "Ally",  prefix = "/a "  });
        channels.Add(new { label = "Novice Network", shortLabel = "NN",    prefix = "/n "  });

        var infoChat = FFXIVClientStructs.FFXIV.Client.UI.Info.InfoProxyChat.Instance();
        if (infoChat != null)
        {
            for (uint i = 0; i < 8; i++)
            {
                var lsNameUtf = infoChat->GetLinkShellName(i);
                if (lsNameUtf.HasValue && lsNameUtf.Length > 0)
                {
                    var name = lsNameUtf.ToString();
                    if (!string.IsNullOrEmpty(name))
                        channels.Add(new { label = $"LS{i + 1}: {name}", shortLabel = $"LS{i + 1}", prefix = $"/l{i + 1} " });
                }
            }
        }

        var cwlsProxy = FFXIVClientStructs.FFXIV.Client.UI.Info.InfoProxyCrossWorldLinkshell.Instance();
        if (cwlsProxy != null)
        {
            for (uint i = 0; i < 8; i++)
            {
                var cwlsNameUtf = cwlsProxy->GetCrossworldLinkshellName(i);
                if (cwlsNameUtf != null && cwlsNameUtf->Length > 0)
                {
                    var name = cwlsNameUtf->ToString();
                    if (!string.IsNullOrEmpty(name))
                        channels.Add(new { label = $"CWLS{i + 1}: {name}", shortLabel = $"CWLS{i + 1}", prefix = $"/cwl{i + 1} " });
                }
            }
        }

        return JsonSerializer.Serialize(new { type = "channels", channels });
    }

    internal unsafe string GetCurrentGameChannelPrefix()
    {
        var shell = FFXIVClientStructs.FFXIV.Client.UI.Shell.RaptureShellModule.Instance();
        if (shell == null) return string.Empty;

        var type = shell->ChatType;

        return type switch
        {
            10  => "/s ",    // Say
            11  => "/sh ",   // Shout
            14  => "/p ",    // Party
            15  => "/a ",    // Alliance
            16  => "/l1 ",   // Ls1
            17  => "/l2 ",   // Ls2
            18  => "/l3 ",   // Ls3
            19  => "/l4 ",   // Ls4
            20  => "/l5 ",   // Ls5
            21  => "/l6 ",   // Ls6
            22  => "/l7 ",   // Ls7
            23  => "/l8 ",   // Ls8
            24  => "/fc ",   // FreeCompany
            27  => "/n ",    // NoviceNetwork
            30  => "/y ",    // Yell
            37  => "/cwl1 ", // CrossLinkShell1
            101 => "/cwl2 ", // CrossLinkShell2
            102 => "/cwl3 ", // CrossLinkShell3
            103 => "/cwl4 ", // CrossLinkShell4
            104 => "/cwl5 ", // CrossLinkShell5
            105 => "/cwl6 ", // CrossLinkShell6
            106 => "/cwl7 ", // CrossLinkShell7
            107 => "/cwl8 ", // CrossLinkShell8
            _   => string.Empty
        };
    }
}

internal class SendMessagePayload
{
    public string Message { get; set; } = string.Empty;
}
