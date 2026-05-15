using System.Buffers.Binary;
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

    public static string HashPasscode(string passcode)
    {
        if (string.IsNullOrEmpty(passcode)) return "";
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key  = Pbkdf2HmacSha256(Encoding.UTF8.GetBytes(passcode), salt, Iterations, KeySize);
        return $"pbkdf2:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(key)}";
    }

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
            var inputKey  = Pbkdf2HmacSha256(Encoding.UTF8.GetBytes(passcode), salt, Iterations, KeySize);
            return CryptographicOperations.FixedTimeEquals(inputKey, storedKey);
        }
        catch
        {
            return false;
        }
    }

    // Pure managed PBKDF2-SHA256 (RFC 2898 §5.2) — avoids BCryptDeriveKeyPBKDF2 which is
    // missing in Wine < 11, causing CryptographicException on Linux/Proton users.
    private static byte[] Pbkdf2HmacSha256(byte[] password, byte[] salt, int iterations, int keySize)
    {
        const int hashLen  = 32; // SHA-256 output bytes
        var blockCount = (keySize + hashLen - 1) / hashLen;
        var output     = new byte[keySize];
        var saltBlock  = new byte[salt.Length + 4];
        salt.CopyTo(saltBlock, 0);

        for (var i = 1; i <= blockCount; i++)
        {
            BinaryPrimitives.WriteInt32BigEndian(saltBlock.AsSpan(salt.Length), i);

            using var hmac = new HMACSHA256(password);
            var u = hmac.ComputeHash(saltBlock);
            var t = (byte[])u.Clone();

            for (var j = 1; j < iterations; j++)
            {
                u = hmac.ComputeHash(u);
                for (var k = 0; k < hashLen; k++) t[k] ^= u[k];
            }

            var destOffset = (i - 1) * hashLen;
            var copyLen    = Math.Min(hashLen, keySize - destOffset);
            Buffer.BlockCopy(t, 0, output, destOffset, copyLen);
        }

        return output;
    }
}
