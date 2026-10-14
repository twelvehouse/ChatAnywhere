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
            var fdt = data.GetFile(SymbolFontBuilder.FdtPath)?.Data;
            if (fdt == null)
            {
                Log.Error($"[FontManager] {SymbolFontBuilder.FdtPath} not found");
                return;
            }

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

            var font = SymbolFontBuilder.Build(data, fdt, GameSymFont, Log);
            if (font == null) return;
            WriteAtomic(path, font);
            SymbolFontPath = path;

            foreach (var old in Directory.GetFiles(dir, "ChatAnywhere_Symbols.*.ttf"))
            {
                if (old == path) continue;
                try
                {
                    File.Delete(old);
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, $"[FontManager] Failed to delete old symbol font: {old}");
                }
            }
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
                var cached = File.ReadAllBytes(filePath);
                if (IsFont(cached))
                {
                    GameSymFont = cached;
                    Log.Info($"[FontManager] Font loaded from file: {GameSymFont.Length} bytes");
                    return;
                }
                Log.Warning("[FontManager] Cached font is invalid, downloading again...");
            }
            else
            {
                Log.Info("[FontManager] Font file missing, downloading...");
            }

            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            using var response = client.GetAsync("https://img.finalfantasyxiv.com/lds/pc/global/fonts/FFXIV_Lodestone_SSF.ttf").Result;
            response.EnsureSuccessStatusCode();
            var font = response.Content.ReadAsByteArrayAsync().Result;
            if (!IsFont(font))
                throw new InvalidDataException("Downloaded file is not a font");

            WriteAtomic(filePath, font);
            GameSymFont = font;
            Log.Info($"[FontManager] Font downloaded and saved: {GameSymFont.Length} bytes");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[FontManager] Failed to load font");
        }
    }

    // Keeps an error page from being cached as the font.
    private static bool IsFont(byte[] data)
    {
        if (data.Length < 12) return false;
        var tag = data.AsSpan(0, 4);
        return tag.SequenceEqual(new byte[] { 0, 1, 0, 0 }) || tag.SequenceEqual("OTTO"u8);
    }

    private static void WriteAtomic(string path, byte[] data)
    {
        var tmp = path + ".tmp";
        File.WriteAllBytes(tmp, data);
        File.Move(tmp, path, true);
    }
}
