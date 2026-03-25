using System.IO;
using System.IO.Compression;

namespace ChatAnywhere.Core;

/// <summary>
/// Minimal PNG encoder. Converts B8G8R8A8 (BGRA) pixel data to a PNG byte array.
/// No external dependencies — uses only BCL ZLibStream for compression.
/// </summary>
internal static class PngEncoder
{
    /// <summary>
    /// Encodes raw BGRA pixel data as a PNG image.
    /// </summary>
    public static byte[] Encode(byte[] bgra, int width, int height)
    {
        // Build raw scanlines: 1 filter byte (None=0) + RGBA pixels per row.
        // Swap B↔R channels to convert BGRA → RGBA for PNG.
        var rowLen = 1 + width * 4;
        var raw = new byte[height * rowLen];
        for (var y = 0; y < height; y++)
        {
            raw[y * rowLen] = 0; // filter: None
            for (var x = 0; x < width; x++)
            {
                var s = (y * width + x) * 4;
                var d = y * rowLen + 1 + x * 4;
                raw[d]     = bgra[s + 2]; // R (from B8G8R8A8 position 2)
                raw[d + 1] = bgra[s + 1]; // G
                raw[d + 2] = bgra[s];     // B (from B8G8R8A8 position 0)
                raw[d + 3] = bgra[s + 3]; // A
            }
        }

        // Compress with zlib
        byte[] compressed;
        using (var ms = new MemoryStream())
        {
            using (var zlib = new ZLibStream(ms, CompressionMode.Compress, leaveOpen: true))
                zlib.Write(raw, 0, raw.Length);
            compressed = ms.ToArray();
        }

        using var png = new MemoryStream();
        png.Write(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }); // PNG signature

        var ihdr = new byte[13];
        WriteBE32(ihdr, 0, width);
        WriteBE32(ihdr, 4, height);
        ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
        WriteChunk(png, "IHDR", ihdr);
        WriteChunk(png, "IDAT", compressed);
        WriteChunk(png, "IEND", []);

        return png.ToArray();
    }

    private static void WriteChunk(Stream stream, string type, byte[] data)
    {
        var typeBytes = System.Text.Encoding.ASCII.GetBytes(type);
        var lenBuf = new byte[4];
        WriteBE32(lenBuf, 0, data.Length);
        stream.Write(lenBuf);
        stream.Write(typeBytes);
        stream.Write(data);

        uint crc = 0xFFFFFFFFu;
        foreach (var b in typeBytes) crc = (crc >> 8) ^ s_crc32[(crc ^ b) & 0xFF];
        foreach (var b in data)      crc = (crc >> 8) ^ s_crc32[(crc ^ b) & 0xFF];
        crc ^= 0xFFFFFFFFu;
        var crcBuf = new byte[4];
        WriteBE32(crcBuf, 0, (int)crc);
        stream.Write(crcBuf);
    }

    private static void WriteBE32(byte[] buf, int offset, int value)
    {
        buf[offset]     = (byte)(value >> 24);
        buf[offset + 1] = (byte)(value >> 16);
        buf[offset + 2] = (byte)(value >> 8);
        buf[offset + 3] = (byte)value;
    }

    private static readonly uint[] s_crc32 = BuildCrc32Table();
    private static uint[] BuildCrc32Table()
    {
        var t = new uint[256];
        for (uint i = 0; i < 256; i++)
        {
            var c = i;
            for (var j = 0; j < 8; j++) c = (c & 1) != 0 ? (0xEDB88320u ^ (c >> 1)) : (c >> 1);
            t[i] = c;
        }
        return t;
    }
}
