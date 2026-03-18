using System.Collections.Concurrent;
using System.Collections.Generic;
using Dalamud.Game.Text;

namespace ChatAnywhere.Core;

/// <summary>
/// In-memory chat history store.
/// Tracks only important channel types, up to <see cref="MaxPerType"/> messages per type.
/// No persistence required — data may be discarded when the game exits.
/// </summary>
public sealed class ChatHistory
{
    /// <summary>Per-channel type history limit.</summary>
    public const int MaxPerType = 200;

    /// <summary>
    /// Message types saved to history and broadcast via SSE.
    /// Includes all chat channels + informational system messages.
    /// Excludes high-frequency battle/effect/noise types.
    /// </summary>
    public static readonly IReadOnlySet<XivChatType> TrackedTypes = new HashSet<XivChatType>
    {
        // ---- Player chat ----
        XivChatType.Say,
        XivChatType.Party,
        XivChatType.Alliance,
        XivChatType.FreeCompany,
        XivChatType.TellIncoming,
        XivChatType.TellOutgoing,
        XivChatType.Shout,
        XivChatType.Yell,
        XivChatType.NoviceNetwork,
        XivChatType.CustomEmote,
        XivChatType.StandardEmote,
        XivChatType.PvPTeam,
        XivChatType.CrossParty,               // 32
        (XivChatType)69,                      // FreeCompanyAnnouncement
        (XivChatType)70,                      // FreeCompanyLoginLogout
        (XivChatType)75,                      // NoviceNetworkSystem
        (XivChatType)77,                      // PvpTeamAnnouncement
        (XivChatType)78,                      // PvpTeamLoginLogout
        // Linkshell 1-8
        XivChatType.Ls1,
        XivChatType.Ls2,
        XivChatType.Ls3,
        XivChatType.Ls4,
        XivChatType.Ls5,
        XivChatType.Ls6,
        XivChatType.Ls7,
        XivChatType.Ls8,
        // Cross-World Linkshell 1-8
        XivChatType.CrossLinkShell1,
        XivChatType.CrossLinkShell2,
        XivChatType.CrossLinkShell3,
        XivChatType.CrossLinkShell4,
        XivChatType.CrossLinkShell5,
        XivChatType.CrossLinkShell6,
        XivChatType.CrossLinkShell7,
        XivChatType.CrossLinkShell8,
        // ---- Informational (Echo and below) ----
        XivChatType.Echo,                     // 56 - plugin/system echo
        // XivChatType.NPCDialogue,              // 61 - NPC story dialogue
        // XivChatType.NPCDialogueAnnouncements, // 68 - NPC world announcements
        // XivChatType.RetainerSale,             // 71 - retainer/loot sale notices
    };

    /// <summary>
    /// Map of channel type → ordered list of received messages.
    /// Each list is protected by a <c>lock</c>.
    /// </summary>
    private readonly ConcurrentDictionary<XivChatType, LinkedList<ReceivedChatMessage>> _store = new();

    /// <summary>
    /// Adds a message to the history.
    /// Ignores untracked types. Evicts the oldest entry when the per-type cap is exceeded.
    /// </summary>
    public void Add(ReceivedChatMessage message)
    {
        var type = (XivChatType)message.Type;
        if (!TrackedTypes.Contains(type)) return;

        var list = _store.GetOrAdd(type, _ => new LinkedList<ReceivedChatMessage>());
        lock (list)
        {
            list.AddLast(message);
            while (list.Count > MaxPerType)
            {
                list.RemoveFirst();
            }
        }
    }

    /// <summary>
    /// Returns all tracked messages across every channel type, sorted chronologically (oldest first).
    /// Each returned message has <see cref="ReceivedChatMessage.IsHistory"/> set to true.
    /// </summary>
    public IEnumerable<ReceivedChatMessage> GetAllHistoryChronological()
    {
        // Collect all messages and sort by timestamp ascending
        var all = new List<ReceivedChatMessage>();
        foreach (var kvp in _store)
        {
            lock (kvp.Value)
            {
                foreach (var msg in kvp.Value)
                {
                    // Copy and set the IsHistory flag
                    all.Add(msg.AsHistory());
                }
            }
        }

        all.Sort((a, b) => a.Timestamp.CompareTo(b.Timestamp));
        return all;
    }

    /// <summary>
    /// Returns up to <paramref name="limit"/> messages with timestamps strictly before
    /// <paramref name="beforeTimestamp"/> (or all messages when null), sorted chronologically.
    /// Returns the newest <paramref name="limit"/> entries from the matching set.
    /// Each returned message has <see cref="ReceivedChatMessage.IsHistory"/> set to true.
    /// </summary>
    public IEnumerable<ReceivedChatMessage> GetHistoryBefore(long? beforeTimestamp, int limit)
    {
        var all = new List<ReceivedChatMessage>();
        foreach (var kvp in _store)
        {
            lock (kvp.Value)
            {
                foreach (var msg in kvp.Value)
                {
                    if (beforeTimestamp == null || msg.Timestamp < beforeTimestamp)
                        all.Add(msg.AsHistory());
                }
            }
        }

        all.Sort((a, b) => a.Timestamp.CompareTo(b.Timestamp));

        var skip = Math.Max(0, all.Count - limit);
        return all.Skip(skip);
    }

    /// <summary>Clears all stored messages across every channel type.</summary>
    public void Clear()
    {
        foreach (var kvp in _store)
        {
            lock (kvp.Value) { kvp.Value.Clear(); }
        }
    }

    /// <summary>Returns the total number of messages across all types (for debugging).</summary>
    public int TotalCount()
    {
        var total = 0;
        foreach (var kvp in _store)
        {
            lock (kvp.Value) { total += kvp.Value.Count; }
        }
        return total;
    }
}
