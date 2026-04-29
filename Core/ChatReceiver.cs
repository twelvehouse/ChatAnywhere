using System.Text.RegularExpressions;
using Dalamud.Game.Chat;
using Dalamud.Game.Text;
using Dalamud.Game.Text.SeStringHandling.Payloads;
using Dalamud.Plugin.Services;

namespace ChatAnywhere.Core;

// Custom DTO for easy serialization
public class ReceivedChatMessage
{
    public ushort Type { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderWorld { get; set; } = string.Empty;
    public System.Collections.Generic.List<ChatPayloadDto> MessagePayloads { get; set; } = new();
    public long Timestamp { get; set; }

    /// <summary>
    /// For TellOutgoing only: the name of the player this message was sent to.
    /// Null for all other message types.
    /// </summary>
    public string? RecipientName { get; set; } = null;

    /// <summary>
    /// For TellOutgoing only: the home world of the recipient.
    /// Null for all other message types.
    /// </summary>
    public string? RecipientWorld { get; set; } = null;

    /// <summary>
    /// When true, this message was delivered as history on connect, not as a real-time event.
    /// The client should suppress sound effects and similar notifications.
    /// </summary>
    public bool IsHistory { get; set; } = false;

    /// <summary>Returns a shallow copy with IsHistory set to true, for history delivery.</summary>
    public ReceivedChatMessage AsHistory() => new ReceivedChatMessage
    {
        Type = Type,
        SenderName = SenderName,
        SenderWorld = SenderWorld,
        RecipientName = RecipientName,
        RecipientWorld = RecipientWorld,
        MessagePayloads = MessagePayloads,
        Timestamp = Timestamp,
        IsHistory = true,
    };
}

public class ChatPayloadDto
{
    public string Type { get; set; } = "text"; // "text" or "icon"
    public string? Text { get; set; }
    public uint? IconId { get; set; }
}

public class ChatReceiver : IDisposable
{
    private readonly IChatGui ChatGui;
    private readonly IClientState ClientState;
    private readonly IObjectTable ObjectTable;
    private readonly IPluginLog Log;

    public event Action<ReceivedChatMessage>? OnMessageReceived;

    /// <summary>Chat history store. Automatically appends received messages for tracked types only.</summary>
    public ChatHistory History { get; } = new ChatHistory();

    public ChatReceiver(IChatGui chatGui, IClientState clientState, IObjectTable objectTable, IPluginLog log)
    {
        ChatGui = chatGui;
        ClientState = clientState;
        ObjectTable = objectTable;
        Log = log;

        ChatGui.ChatMessageUnhandled += ChatMessageUnhandled;
    }

    private void ChatMessageUnhandled(IChatMessage chatMessage)
    {
        try
        {
            var type = chatMessage.LogKind;
            var sender = chatMessage.Sender;
            var message = chatMessage.Message;

            var msg = new ReceivedChatMessage
            {
                Type = (ushort)type,
                SenderName = Regex.Replace(sender.TextValue, @"[-]", "").Trim(),
                SenderWorld = string.Empty,
                MessagePayloads = new System.Collections.Generic.List<ChatPayloadDto>(),
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            // For TellOutgoing, the 'sender' parameter contains the RECIPIENT's name, not the sender's.
            // Use the local player as the actual sender and preserve the recipient info separately.
            if (type == XivChatType.TellOutgoing && ObjectTable.LocalPlayer != null)
            {
                msg.SenderName = ObjectTable.LocalPlayer.Name.TextValue;
                msg.SenderWorld = ObjectTable.LocalPlayer.HomeWorld.ValueNullable?.Name.ToString() ?? string.Empty;

                // Extract recipient name and world from the 'sender' parameter
                msg.RecipientName = Regex.Replace(sender.TextValue, @"[-]", "").Trim();
                foreach (var payload in sender.Payloads)
                {
                    if (payload is Dalamud.Game.Text.SeStringHandling.Payloads.PlayerPayload pp)
                    {
                        msg.RecipientName = Regex.Replace(pp.PlayerName, @"[-]", "").Trim();
                        msg.RecipientWorld = pp.World.ValueNullable?.Name.ToString() ?? string.Empty;
                        break;
                    }
                }
                // Fall back to local player's world if recipient world couldn't be determined
                if (string.IsNullOrEmpty(msg.RecipientWorld))
                    msg.RecipientWorld = msg.SenderWorld;
            }
            else
            {
                // Extract world name from PlayerPayload
                foreach (var payload in sender.Payloads)
                {
                    if (payload is Dalamud.Game.Text.SeStringHandling.Payloads.PlayerPayload pp)
                    {
                        msg.SenderWorld = pp.World.ValueNullable?.Name.ToString() ?? string.Empty;
                        msg.SenderName = Regex.Replace(pp.PlayerName, @"[-]", "").Trim();
                        break;
                    }
                }

                // Fall back to the local player's home world (e.g. same-world messages omit the sender world)
                if (string.IsNullOrEmpty(msg.SenderWorld) && ObjectTable.LocalPlayer != null)
                {
                    msg.SenderWorld = ObjectTable.LocalPlayer.HomeWorld.ValueNullable?.Name.ToString() ?? string.Empty;
                }
            }

            foreach (var payload in message.Payloads)
            {
                if (payload is TextPayload tp)
                {
                    msg.MessagePayloads.Add(new ChatPayloadDto { Type = "text", Text = tp.Text });
                }
                else if (payload is IconPayload ip)
                {
                    msg.MessagePayloads.Add(new ChatPayloadDto { Type = "icon", IconId = (uint)ip.Icon });
                }
                else if (payload is AutoTranslatePayload atp)
                {
                    // Auto-translate begin icon (ID: 54: AutoTranslateBegin)
                    msg.MessagePayloads.Add(new ChatPayloadDto { Type = "icon", IconId = 54 });

                    // Text content (strip the leading/trailing bracket glyphs)
                    var text = atp.Text;
                    if (text.Length >= 4)
                    {
                        text = text.Substring(2, text.Length - 4);
                    }
                    msg.MessagePayloads.Add(new ChatPayloadDto { Type = "text", Text = text.Trim() });

                    // Auto-translate end icon (ID: 55: AutoTranslateEnd)
                    msg.MessagePayloads.Add(new ChatPayloadDto { Type = "icon", IconId = 55 });
                }
                else if (payload is RawPayload rp
                         && rp.Data is [_, (byte)Lumina.Text.Payloads.MacroCode.NonBreakingSpace, _, _])
                {
                    // Convert non-breaking space to a regular space to prevent text from appearing jammed together
                    msg.MessagePayloads.Add(new ChatPayloadDto { Type = "text", Text = " " });
                }
            }

            // For CustomEmote (28), the game message text does NOT include the sender's name,
            // so we prepend it into the payload stream so the frontend can display it.
            if (msg.Type == (ushort)XivChatType.CustomEmote && !string.IsNullOrEmpty(msg.SenderName))
            {
                msg.MessagePayloads.Insert(0, new ChatPayloadDto { Type = "text", Text = msg.SenderName });
            }

            // Only save history and broadcast for tracked types.
            // High-frequency battle/effect/system types are intentionally excluded.
            if (!ChatHistory.TrackedTypes.Contains((XivChatType)msg.Type))
                return;

            // Save to history store
            History.Add(msg);

            OnMessageReceived?.Invoke(msg);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to parse incoming chat message.");
        }
    }

    public void Dispose()
    {
        ChatGui.ChatMessageUnhandled -= ChatMessageUnhandled;
    }
}
