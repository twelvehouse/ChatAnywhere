using System.Text;
using System.Text.Json;
using Dalamud.Plugin.Services;
using WatsonWebserver.Core;

namespace ChatAnywhere.Core;

internal class SettingsHandler
{
    private readonly Plugin _plugin;
    private readonly IPluginLog _log;
    private readonly AuthHandler _auth;

    private string GlobalSettingsPath =>
        Path.Combine(_plugin.Interface.ConfigDirectory.FullName, "frontend-settings.json");

    internal SettingsHandler(Plugin plugin, IPluginLog log, AuthHandler auth)
    {
        _plugin = plugin;
        _log = log;
        _auth = auth;
    }

    private string CharacterSettingsPath(string name, string world) =>
        Path.Combine(_plugin.Interface.ConfigDirectory.FullName, $"{name}@{world}.json");

    private async Task<JsonDocument?> ReadGlobalAsync()
    {
        if (!File.Exists(GlobalSettingsPath)) return null;
        try
        {
            var json = await File.ReadAllTextAsync(GlobalSettingsPath);
            return JsonDocument.Parse(json);
        }
        catch
        {
            return null;
        }
    }

    private static IReadOnlyList<string> GetPersonalFilterCharacters(JsonDocument? global)
    {
        if (global == null) return [];
        if (!global.RootElement.TryGetProperty("personalFilterCharacters", out var arr))
            return [];
        var list = new List<string>();
        foreach (var item in arr.EnumerateArray())
        {
            var s = item.GetString();
            if (s != null) list.Add(s);
        }
        return list;
    }

    // Rebuilds the global settings JSON with the given personalFilterCharacters list, preserving all other fields.
    private static string BuildSettingsWithPersonalFilterCharacters(JsonElement root, IReadOnlyList<string> personalChars)
    {
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream);
        writer.WriteStartObject();
        foreach (var prop in root.EnumerateObject())
        {
            if (prop.Name == "personalFilterCharacters") continue;
            prop.WriteTo(writer);
        }
        writer.WritePropertyName("personalFilterCharacters");
        writer.WriteStartArray();
        foreach (var key in personalChars)
            writer.WriteStringValue(key);
        writer.WriteEndArray();
        writer.WriteEndObject();
        writer.Flush();
        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private async Task UpdatePersonalFilterCharacters(List<string> updatedList)
    {
        JsonElement root;
        if (File.Exists(GlobalSettingsPath))
        {
            try
            {
                var existing = await File.ReadAllTextAsync(GlobalSettingsPath);
                using var doc = JsonDocument.Parse(existing);
                root = doc.RootElement.Clone();
            }
            catch
            {
                root = JsonDocument.Parse("{}").RootElement.Clone();
            }
        }
        else
        {
            root = JsonDocument.Parse("{}").RootElement.Clone();
        }
        await File.WriteAllTextAsync(GlobalSettingsPath, BuildSettingsWithPersonalFilterCharacters(root, updatedList));
    }

    // Reads from the character-specific file if the character is in personalFilterCharacters; otherwise global.
    private async Task<string> GetReadPathAsync()
    {
        var name = _plugin.LocalPlayerName;
        var world = _plugin.LocalPlayerWorld;
        if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(world))
        {
            var key = $"{name}@{world}";
            using var global = await ReadGlobalAsync();
            if (GetPersonalFilterCharacters(global).Contains(key))
            {
                var charPath = CharacterSettingsPath(name, world);
                if (File.Exists(charPath)) return charPath;
            }
        }
        return GlobalSettingsPath;
    }

    internal async Task HandleGetSettings(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var path = await GetReadPathAsync();
            var json = File.Exists(path) ? await File.ReadAllTextAsync(path) : "{}";

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(json);
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to read frontend settings.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandleGetCharacters(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var configDir = _plugin.Interface.ConfigDirectory.FullName;
            var sb = new StringBuilder("[");
            var first = true;

            foreach (var file in Directory.EnumerateFiles(configDir, "*.json"))
            {
                var fileName = Path.GetFileName(file);
                if (fileName.Equals("frontend-settings.json", StringComparison.OrdinalIgnoreCase))
                    continue;

                var key = Path.GetFileNameWithoutExtension(fileName);
                try
                {
                    var json = await File.ReadAllTextAsync(file);
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    var filtersJson = root.TryGetProperty("filters", out var f) ? f.GetRawText() : "[]";
                    var foldersJson = root.TryGetProperty("folders", out var fo) ? fo.GetRawText() : "[]";

                    if (!first) sb.Append(',');
                    sb.Append($"{{\"key\":{JsonSerializer.Serialize(key)},\"filters\":{filtersJson},\"folders\":{foldersJson}}}");
                    first = false;
                }
                catch
                {
                    // Skip malformed files
                }
            }

            sb.Append(']');

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(sb.ToString());
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to list character settings.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandleGetFilterMode(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var name = _plugin.LocalPlayerName;
            var world = _plugin.LocalPlayerWorld;

            using var global = await ReadGlobalAsync();
            var personalChars = GetPersonalFilterCharacters(global).ToList();

            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(world))
            {
                var notLoggedIn = $"{{\"characterKey\":null,\"isPersonal\":false,\"hasExistingFile\":false,\"personalFilterCharacters\":{JsonSerializer.Serialize(personalChars)}}}";
                ctx.Response.StatusCode = 200;
                _auth.AddCorsHeaders(ctx);
                ctx.Response.Headers.Add("Content-Type", "application/json");
                await ctx.Response.Send(notLoggedIn);
                return;
            }

            var characterKey = $"{name}@{world}";
            var isPersonal = personalChars.Contains(characterKey);
            var hasExistingFile = File.Exists(CharacterSettingsPath(name, world));

            var result = $"{{\"characterKey\":{JsonSerializer.Serialize(characterKey)},\"isPersonal\":{(isPersonal ? "true" : "false")},\"hasExistingFile\":{(hasExistingFile ? "true" : "false")},\"personalFilterCharacters\":{JsonSerializer.Serialize(personalChars)}}}";

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send(result);
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to get filter mode.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandleEnablePersonalFilters(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var name = _plugin.LocalPlayerName;
            var world = _plugin.LocalPlayerWorld;

            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(world))
            {
                ctx.Response.StatusCode = 400;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("{\"error\":\"not-logged-in\"}");
                return;
            }

            var characterKey = $"{name}@{world}";
            var charPath = CharacterSettingsPath(name, world);

            var copyFromGlobal = true;
            var body = await HttpHelper.ReadBodyAsync(ctx, 256);
            if (!string.IsNullOrEmpty(body))
            {
                try
                {
                    using var bodyDoc = JsonDocument.Parse(body);
                    if (bodyDoc.RootElement.TryGetProperty("copyFromGlobal", out var copyProp))
                        copyFromGlobal = copyProp.GetBoolean();
                }
                catch { /* ignore parse errors */ }
            }

            using var global = await ReadGlobalAsync();
            var personalChars = GetPersonalFilterCharacters(global).ToList();

            if (!personalChars.Contains(characterKey))
                personalChars.Add(characterKey);

            // Create or overwrite char file from global when requested, or on first fork.
            // Strip personalFilterCharacters — it's a global-only field that must not leak into character files.
            if (!File.Exists(charPath) || copyFromGlobal)
            {
                var charJson = global != null
                    ? BuildSettingsWithPersonalFilterCharacters(global.RootElement, [])
                    : "{}";
                await File.WriteAllTextAsync(charPath, charJson);
            }

            await UpdatePersonalFilterCharacters(personalChars);

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send("{\"ok\":true}");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to enable personal filters.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandleDisablePersonalFilters(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var name = _plugin.LocalPlayerName;
            var world = _plugin.LocalPlayerWorld;

            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(world))
            {
                ctx.Response.StatusCode = 400;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("{\"error\":\"not-logged-in\"}");
                return;
            }

            var characterKey = $"{name}@{world}";
            using var global = await ReadGlobalAsync();
            var personalChars = GetPersonalFilterCharacters(global).ToList();
            personalChars.Remove(characterKey);

            await UpdatePersonalFilterCharacters(personalChars);

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send("{\"ok\":true}");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to disable personal filters.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandleDeleteCharacter(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var keyRaw = ctx.Request.Query.Elements["key"] ?? string.Empty;
            var key = System.Net.WebUtility.UrlDecode(keyRaw);

            if (string.IsNullOrEmpty(key) || key.Contains("..") || key.Contains('/') || key.Contains('\\'))
            {
                ctx.Response.StatusCode = 400;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("{\"error\":\"invalid-key\"}");
                return;
            }

            var configDir = _plugin.Interface.ConfigDirectory.FullName;
            var filePath = Path.GetFullPath(Path.Combine(configDir, $"{key}.json"));
            var configDirFull = Path.GetFullPath(configDir) + Path.DirectorySeparatorChar;

            if (!filePath.StartsWith(configDirFull, StringComparison.OrdinalIgnoreCase))
            {
                ctx.Response.StatusCode = 400;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("{\"error\":\"invalid-key\"}");
                return;
            }

            if (File.Exists(filePath))
                File.Delete(filePath);

            using var global = await ReadGlobalAsync();
            var personalChars = GetPersonalFilterCharacters(global).ToList();
            if (personalChars.Remove(key))
                await UpdatePersonalFilterCharacters(personalChars);

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            ctx.Response.Headers.Add("Content-Type", "application/json");
            await ctx.Response.Send("{\"ok\":true}");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Failed to delete character settings.");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }

    internal async Task HandlePutSettings(HttpContextBase ctx)
    {
        if (!await _auth.RequireAuth(ctx)) return;

        try
        {
            var body = await HttpHelper.ReadBodyAsync(ctx, 65_536);
            if (body == null)
            {
                ctx.Response.StatusCode = 413;
                _auth.AddCorsHeaders(ctx);
                await ctx.Response.Send("Request body too large");
                return;
            }

            if (!string.IsNullOrEmpty(body))
            {
                using var doc = JsonDocument.Parse(body); // validate JSON before storing

                // Determine save path and personalFilterCharacters with a single global read.
                using var globalDoc = await ReadGlobalAsync();
                var personalChars = GetPersonalFilterCharacters(globalDoc);

                var name = _plugin.LocalPlayerName;
                var world = _plugin.LocalPlayerWorld;
                string savePath;
                if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(world)
                    && personalChars.Contains($"{name}@{world}"))
                    savePath = CharacterSettingsPath(name, world);
                else
                    savePath = GlobalSettingsPath;

                // When writing to the global file, preserve personalFilterCharacters
                // (the frontend is unaware of this field and would otherwise erase it)
                if (savePath == GlobalSettingsPath && personalChars.Count > 0)
                    body = BuildSettingsWithPersonalFilterCharacters(doc.RootElement, personalChars);

                await File.WriteAllTextAsync(savePath, body);
            }

            ctx.Response.StatusCode = 200;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("OK");
        }
        catch (JsonException)
        {
            ctx.Response.StatusCode = 400;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Invalid JSON");
        }
        catch (Exception ex)
        {
            _log.Error(ex, "Error handling PUT /settings");
            ctx.Response.StatusCode = 500;
            _auth.AddCorsHeaders(ctx);
            await ctx.Response.Send("Internal Server Error");
        }
    }
}
