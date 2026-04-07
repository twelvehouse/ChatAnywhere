using System.Linq;
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
    private string _editPassword = "";
    private string _editPasswordConfirm = "";

    // Snapshot of saved values — used to detect unsaved changes
    private int _savedPort;
    private bool _savedAutoStart;
    private string _savedPasswordHash = "";

    // Cached once on open — network enumeration is too expensive to run every frame
    private List<(string Label, string Url)> _cachedUrls = [];

    private static readonly Vector4 ColorGreen  = new(0.4f, 0.9f, 0.4f, 1f);
    private static readonly Vector4 ColorRed    = new(0.9f, 0.4f, 0.4f, 1f);
    private static readonly Vector4 ColorYellow = new(1f, 0.85f, 0.2f, 1f);
    private static readonly Vector4 ColorMuted  = new(0.6f, 0.6f, 0.6f, 1f);

    public SettingsWindow(Plugin plugin) : base("ChatAnywhere - Settings###chatanywhere-settings", ImGuiWindowFlags.AlwaysAutoResize)
    {
        _plugin = plugin;
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
        _editPort             = _plugin.Config.WebinterfacePort;
        _editAutoStart        = _plugin.Config.WebinterfaceEnabled;
        _editPassword         = "";
        _editPasswordConfirm  = "";
        _savedPort            = _editPort;
        _savedAutoStart       = _editAutoStart;
        _savedPasswordHash    = _plugin.Config.WebinterfacePasswordHash;
    }

    /// <summary>
    /// Returns true if any edit field has been changed since the last save/open.
    /// </summary>
    private bool HasUnsavedChanges()
    {
        if (_editPort != _savedPort) return true;
        if (_editAutoStart != _savedAutoStart) return true;
        if (_editPassword.Length > 0) return true;
        return false;
    }

    /// <summary>
    /// Returns true if the password fields contain a new valid passcode ready to save.
    /// </summary>
    private bool IsNewPasscodeValid() =>
        _editPassword.Length >= 4
        && _editPassword.Length <= 8
        && _editPassword == _editPasswordConfirm;

    private void Save()
    {
        _plugin.Config.WebinterfacePort    = _editPort;
        _plugin.Config.WebinterfaceEnabled = _editAutoStart;

        if (IsNewPasscodeValid())
            _plugin.Config.WebinterfacePasswordHash = Configuration.HashPasscode(_editPassword);

        _plugin.SaveConfig();

        // Update snapshot so unsaved-changes warning clears
        _editPassword        = "";
        _editPasswordConfirm = "";
        _savedPort           = _editPort;
        _savedAutoStart      = _editAutoStart;
        _savedPasswordHash   = _plugin.Config.WebinterfacePasswordHash;
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

        // ─── Security ─────────────────────────────────────────────────
        SectionHeader("Security");

        // Show warning if no passcode has been saved yet
        if (string.IsNullOrEmpty(_savedPasswordHash))
        {
            ImGui.TextColored(ColorRed, "Passcode not configured — the web interface cannot be accessed.");
            ImGui.Spacing();
        }

        ImGui.SetNextItemWidth(120);
        ImGui.InputText("New Passcode##passcode", ref _editPassword, 8, ImGuiInputTextFlags.Password);
        ImGui.SameLine();
        ImGui.TextColored(ColorMuted, "(4–8 digits)");

        var digitsOnly = new string(_editPassword.Where(char.IsDigit).ToArray());
        if (digitsOnly != _editPassword) _editPassword = digitsOnly;

        ImGui.SetNextItemWidth(120);
        ImGui.InputText("Confirm##passcode-confirm", ref _editPasswordConfirm, 8, ImGuiInputTextFlags.Password);

        var confirmDigitsOnly = new string(_editPasswordConfirm.Where(char.IsDigit).ToArray());
        if (confirmDigitsOnly != _editPasswordConfirm) _editPasswordConfirm = confirmDigitsOnly;

        if (_editPassword.Length > 0 && _editPasswordConfirm.Length > 0
            && _editPassword != _editPasswordConfirm)
        {
            ImGui.TextColored(ColorRed, "  Passcodes do not match.");
        }

        if (!string.IsNullOrEmpty(_savedPasswordHash) && _editPassword.Length == 0)
            ImGui.TextColored(ColorMuted, "  Leave blank to keep the current passcode.");

        if (isRunning)
        {
            ImGui.Spacing();
            if (ImGui.Button("Invalidate All Sessions"))
                _plugin.Server.InvalidateAllSessions();
            if (ImGui.IsItemHovered())
                ImGui.SetTooltip("Forces all connected browsers to re-authenticate.");
        }

        ImGui.Spacing();
        ImGui.Separator();
        ImGui.Spacing();

        // Unsaved-changes warning
        if (HasUnsavedChanges())
            ImGui.TextColored(ColorYellow, "  * You have unsaved changes.");

        // ─── Buttons ──────────────────────────────────────────────────
        // Disable Save when a new passcode is partially entered but invalid
        var newPasscodeStarted = _editPassword.Length > 0 || _editPasswordConfirm.Length > 0;
        var canSave = !newPasscodeStarted || IsNewPasscodeValid();

        using (ImRaii.Disabled(!canSave))
        {
            if (ImGui.Button("Save"))
                Save();

            ImGui.SameLine();

            if (ImGui.Button("Save & Close"))
            {
                Save();
                IsOpen = false;
            }
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
