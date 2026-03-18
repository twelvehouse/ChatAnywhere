using System;
using System.Text;
using Dalamud.Plugin.Services;
using FFXIVClientStructs.FFXIV.Client.System.String;
using FFXIVClientStructs.FFXIV.Client.UI;

namespace ChatAnywhere.Core;

public unsafe class ChatSender
{
    private readonly IPluginLog Log;

    public ChatSender(IPluginLog log)
    {
        Log = log;
    }

    public void SendMessage(string message)
    {
        try
        {
            var bytes = Encoding.UTF8.GetBytes(message);
            if (bytes.Length == 0)
                throw new ArgumentException("Message is empty", nameof(message));

            if (bytes.Length > 500)
                throw new ArgumentException("Message is longer than 500 bytes", nameof(message));

            if (message.Length != SanitiseText(message).Length)
                throw new ArgumentException("Message contained invalid characters", nameof(message));

            SendMessageUnsafe(bytes);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to send chat message.");
        }
    }

    private void SendMessageUnsafe(byte[] message)
    {
        var mes = Utf8String.FromSequence(message);
        UIModule.Instance()->ProcessChatBoxEntry(mes);
        mes->Dtor(true);
    }

    private string SanitiseText(string text)
    {
        var uText = Utf8String.FromString(text);
        uText->SanitizeString((AllowedEntities) 0x27F);
        var sanitised = uText->ToString();
        uText->Dtor(true);

        return sanitised;
    }
}
