using Dalamud.Plugin;
using Dalamud.Plugin.Services;

namespace ChatAnywhere.Core;

public class FontManager
{
    public byte[]? GameSymFont { get; private set; }
    private readonly IDalamudPluginInterface PluginInterface;
    private readonly IPluginLog Log;

    public FontManager(IDalamudPluginInterface pi, IPluginLog log)
    {
        PluginInterface = pi;
        Log = log;
        LoadFont();
    }

    private void LoadFont()
    {
        try 
        {
            if (!Directory.Exists(PluginInterface.ConfigDirectory.FullName))
            {
                Directory.CreateDirectory(PluginInterface.ConfigDirectory.FullName);
            }

            var filePath = Path.Combine(PluginInterface.ConfigDirectory.FullName, "FFXIV_Lodestone_SSF.ttf");
            Log.Debug($"[FontManager] Font path: {filePath}");

            if (File.Exists(filePath))
            {
                GameSymFont = File.ReadAllBytes(filePath);
                Log.Info($"[FontManager] Font loaded from file: {GameSymFont.Length} bytes");
            }
            else
            {
                Log.Info("[FontManager] Font file missing, downloading...");
                using var client = new HttpClient();
                GameSymFont = client.GetAsync("https://img.finalfantasyxiv.com/lds/pc/global/fonts/FFXIV_Lodestone_SSF.ttf")
                    .Result
                    .Content
                    .ReadAsByteArrayAsync()
                    .Result;

                File.WriteAllBytes(filePath, GameSymFont);
                Log.Info($"[FontManager] Font downloaded and saved: {GameSymFont.Length} bytes");
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[FontManager] Failed to load font");
        }
    }
}
