using System.Security.Cryptography;
using Dalamud.Plugin;
using Dalamud.Plugin.Services;

namespace ChatAnywhere.Core;

public class FontManager
{
    public byte[]? GameSymFont { get; private set; }
    public string? SymbolFontPath { get; private set; }
    private readonly IDalamudPluginInterface PluginInterface;
    private readonly IPluginLog Log;

    public FontManager(IDalamudPluginInterface pi, IDataManager data, IPluginLog log)
    {
        PluginInterface = pi;
        Log = log;
        LoadFont();
        BuildSymbolFont(data);
    }

    private void BuildSymbolFont(IDataManager data)
    {
        if (GameSymFont == null) return;
        try
        {
            var fdt = data.GetFile(SymbolFontBuilder.FdtPath)!.Data;

            // Rebuild whenever the game font, the Lodestone font or the builder changes.
            using var sha = SHA256.Create();
            sha.TransformBlock(BitConverter.GetBytes(SymbolFontBuilder.Version), 0, sizeof(int), null, 0);
            sha.TransformBlock(fdt, 0, fdt.Length, null, 0);
            sha.TransformFinalBlock(GameSymFont, 0, GameSymFont.Length);
            var hash = Convert.ToHexString(sha.Hash!)[..16].ToLowerInvariant();

            var dir = PluginInterface.ConfigDirectory.FullName;
            var path = Path.Combine(dir, $"ChatAnywhere_Symbols.{hash}.ttf");
            if (File.Exists(path))
            {
                SymbolFontPath = path;
                return;
            }

            foreach (var old in Directory.GetFiles(dir, "ChatAnywhere_Symbols.*.ttf"))
                File.Delete(old);

            var font = SymbolFontBuilder.Build(data, fdt, GameSymFont, Log);
            if (font == null) return;
            File.WriteAllBytes(path, font);
            SymbolFontPath = path;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[FontManager] Failed to build symbol font");
        }
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
