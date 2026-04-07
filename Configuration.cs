using System.Security.Cryptography;
using System.Text;
using Dalamud.Configuration;

namespace ChatAnywhere;

[Serializable]
public class Configuration : IPluginConfiguration
{
    public int Version { get; set; } = 1;

    public bool WebinterfaceEnabled { get; set; } = true;
    public int WebinterfacePort { get; set; } = 3000;
    public string WebinterfacePasswordHash { get; set; } = "";

    private const int SaltSize   = 16;
    private const int KeySize    = 32;
    private const int Iterations = 100_000;

    /// <summary>
    /// Hashes the passcode using PBKDF2-SHA256 with a random salt.
    /// Returns a string in the format "pbkdf2:{base64salt}:{base64key}",
    /// or an empty string if the input is null or empty.
    /// </summary>
    public static string HashPasscode(string passcode)
    {
        if (string.IsNullOrEmpty(passcode)) return "";
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key  = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(passcode),
            salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"pbkdf2:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(key)}";
    }

    /// <summary>
    /// Verifies the given passcode against a stored PBKDF2 hash ("pbkdf2:{base64salt}:{base64key}").
    /// </summary>
    public static bool VerifyPasscode(string passcode, string storedHash)
    {
        if (string.IsNullOrEmpty(passcode) || string.IsNullOrEmpty(storedHash))
            return false;

        var parts = storedHash.Split(':');
        if (parts.Length != 3 || parts[0] != "pbkdf2") return false;
        try
        {
            var salt      = Convert.FromBase64String(parts[1]);
            var storedKey = Convert.FromBase64String(parts[2]);
            var inputKey  = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(passcode),
                salt, Iterations, HashAlgorithmName.SHA256, KeySize);
            return CryptographicOperations.FixedTimeEquals(inputKey, storedKey);
        }
        catch
        {
            return false;
        }
    }
}
