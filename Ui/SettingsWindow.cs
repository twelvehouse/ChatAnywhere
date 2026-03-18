using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Numerics;
using Dalamud.Interface.Utility.Raii;
using Dalamud.Interface.Windowing;
using Dalamud.Bindings.ImGui;

namespace ChatAnywhere.Ui;

public sealed class SettingsWindow : Window
{
    private readonly Plugin _plugin;

    private int _editPort;
    private bool _editAutoStart;

    // Cached once on open — network enumeration is too expensive to run every frame
    private List<(string Label, string Url)> _cachedUrls = [];

    private static readonly Vector4 ColorGreen  = new(0.4f, 0.9f, 0.4f, 1f);
    private static readonly Vector4 ColorRed    = new(0.9f, 0.4f, 0.4f, 1f);
    private static readonly Vector4 ColorYellow = new(1f, 0.85f, 0.2f, 1f);
    private static readonly Vector4 ColorMuted  = new(0.6f, 0.6f, 0.6f, 1f);

    public SettingsWindow(Plugin plugin) : base("ChatAnywhere - Settings###chatanywhere-settings")
    {
        _plugin = plugin;

        SizeCondition = ImGuiCond.FirstUseEver;
        SizeConstraints = new WindowSizeConstraints
        {
            MinimumSize = new Vector2(400, 380),
            MaximumSize = new Vector2(float.MaxValue, float.MaxValue),
        };
    }

    public override void OnOpen()
    {
        SyncFromConfig();
        RefreshUrls();
    }

    private void RefreshUrls()
    {
        var port = _plugin.Config.WebinterfacePort;
        var urls = new List<(string, string)>
        {
            ("localhost", $"http://localhost:{port}/"),
        };

        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up) continue;
                foreach (var addr in nic.GetIPProperties().UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                    var ip = addr.Address.ToString();
                    if (ip == "127.0.0.1") continue;
                    urls.Add((nic.Name, $"http://{ip}:{port}/"));
                }
            }
        }
        catch { /* ignore NIC enumeration failure */ }

        _cachedUrls = urls;
    }

    private void SyncFromConfig()
    {
        _editPort      = _plugin.Config.WebinterfacePort;
        _editAutoStart = _plugin.Config.WebinterfaceEnabled;
    }

    private void Save()
    {
        _plugin.Config.WebinterfacePort    = _editPort;
        _plugin.Config.WebinterfaceEnabled = _editAutoStart;
        _plugin.SaveConfig();
    }

    public override void Draw()
    {
        var server    = _plugin.Server;
        var isRunning = server.IsRunning;

        // ─── Server Control ────────────────────────────────────────────
        SectionHeader("Server Control");

        ImGui.TextColored(isRunning ? ColorGreen : ColorRed, isRunning ? "● Running" : "○ Stopped");

        ImGui.SameLine(80);

        using (ImRaii.Disabled(isRunning))
        {
            if (ImGui.SmallButton("Start"))
                _plugin.Server.Start();
        }

        ImGui.SameLine();

        using (ImRaii.Disabled(!isRunning))
        {
            if (ImGui.SmallButton("Stop"))
                _plugin.Server.Stop();
        }

        ImGui.Spacing();

        // Access URLs (IPv4)
        ImGui.TextColored(ColorMuted, "Access URLs (IPv4):");
        ImGui.SameLine();
        if (ImGui.SmallButton("Refresh"))
            RefreshUrls();
        foreach (var (label, url) in _cachedUrls)
            DrawUrlRow(label, url);

        ImGui.Spacing();

        // ─── Settings ─────────────────────────────────────────────────
        SectionHeader("Settings");

        ImGui.Checkbox("Auto-start server on plugin load", ref _editAutoStart);

        ImGui.Spacing();

        ImGui.SetNextItemWidth(100);
        if (ImGui.InputInt("Port", ref _editPort))
            _editPort = Math.Clamp(_editPort, 1024, 49151);

        ImGui.SameLine();
        ImGui.TextColored(ColorMuted, "(1024–49151)");

        if (isRunning && server.ActivePort != _editPort)
            ImGui.TextColored(ColorYellow, "  * Port change takes effect after restarting the server.");

        ImGui.Spacing();

        // ─── Commands ─────────────────────────────────────────────────
        SectionHeader("Commands");
        ImGui.TextColored(ColorMuted, "/chatanywhere");
        ImGui.SameLine(150); ImGui.TextUnformatted("Toggle this settings window");
        ImGui.TextColored(ColorMuted, "/chatanywhere start");
        ImGui.SameLine(150); ImGui.TextUnformatted("Start the server");
        ImGui.TextColored(ColorMuted, "/chatanywhere stop");
        ImGui.SameLine(150); ImGui.TextUnformatted("Stop the server");

        ImGui.Spacing();
        ImGui.Separator();
        ImGui.Spacing();

        // ─── Buttons ──────────────────────────────────────────────────
        if (ImGui.Button("Save"))
            Save();

        ImGui.SameLine();

        if (ImGui.Button("Save & Close"))
        {
            Save();
            IsOpen = false;
        }

        ImGui.SameLine();

        if (ImGui.Button("Discard"))
        {
            SyncFromConfig();
            IsOpen = false;
        }
    }

    private static void SectionHeader(string text)
    {
        ImGui.Spacing();
        ImGui.Separator();
        ImGui.TextColored(new Vector4(0.8f, 0.8f, 0.8f, 1f), text);
        ImGui.Separator();
        ImGui.Spacing();
    }

    private static void DrawUrlRow(string label, string url)
    {
        ImGui.TextColored(ColorMuted, $"  {label}:");
        ImGui.SameLine(110);

        if (ImGui.Selectable(url + $"##url-{label}"))
            Dalamud.Utility.Util.OpenLink(url);

        if (ImGui.IsItemHovered())
            ImGui.SetTooltip("Click to open in browser");
    }
}
