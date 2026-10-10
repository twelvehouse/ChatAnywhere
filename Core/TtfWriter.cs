using System.Buffers.Binary;
using System.Text;

namespace ChatAnywhere.Core;

internal static class TtfWriter
{
    public record Glyph(int Codepoint, int Advance, List<(int X0, int Y0, int X1, int Y1)> Rects);

    public record VerticalMetrics(
        short HheaAscender, short HheaDescender,
        short TypoAscender, short TypoDescender, short TypoLineGap,
        int WinAscent, int WinDescent);

    private const string FamilyName = "ChatAnywhere Symbols";
    private const string PostScriptName = "ChatAnywhereSymbols-Regular";

    public static byte[] Write(List<Glyph> glyphs, int unitsPerEm, VerticalMetrics vm)
    {
        glyphs = glyphs.OrderBy(g => g.Codepoint).ToList();
        var numGlyphs = glyphs.Count + 1;

        var glyf = new BigEndianWriter();
        var loca = new BigEndianWriter();
        var hmtx = new BigEndianWriter();
        int xMin = 0, yMin = 0, xMax = 0, yMax = 0, maxPoints = 0, maxContours = 0, maxAdvance = 0;

        loca.U32(0).U32(0); // .notdef is empty
        hmtx.U16(unitsPerEm / 2).S16(0);
        foreach (var g in glyphs)
        {
            var gx0 = g.Rects.Min(r => r.X0);
            var gy0 = g.Rects.Min(r => r.Y0);
            var gx1 = g.Rects.Max(r => r.X1);
            var gy1 = g.Rects.Max(r => r.Y1);
            xMin = Math.Min(xMin, gx0); yMin = Math.Min(yMin, gy0);
            xMax = Math.Max(xMax, gx1); yMax = Math.Max(yMax, gy1);
            maxPoints = Math.Max(maxPoints, g.Rects.Count * 4);
            maxContours = Math.Max(maxContours, g.Rects.Count);
            maxAdvance = Math.Max(maxAdvance, g.Advance);

            glyf.S16(g.Rects.Count).S16(gx0).S16(gy0).S16(gx1).S16(gy1);
            for (var i = 0; i < g.Rects.Count; i++)
                glyf.U16((i * 4) + 3);
            glyf.U16(0);
            for (var i = 0; i < g.Rects.Count * 4; i++)
                glyf.U8(0x01); // on-curve, 16-bit deltas

            // Clockwise per rectangle, as TrueType expects for filled contours.
            var points = g.Rects.SelectMany(r => new[] { (r.X0, r.Y0), (r.X0, r.Y1), (r.X1, r.Y1), (r.X1, r.Y0) }).ToList();
            var prev = 0;
            foreach (var (x, _) in points) { glyf.S16(x - prev); prev = x; }
            prev = 0;
            foreach (var (_, y) in points) { glyf.S16(y - prev); prev = y; }
            glyf.Pad(4);
            loca.U32((uint)glyf.Length);

            hmtx.U16(g.Advance).S16(gx0);
        }

        var cmap = BuildCmap(glyphs);

        var timestamp = (ulong)(DateTime.UtcNow - new DateTime(1904, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
        var head = new BigEndianWriter()
            .U32(0x00010000).U32(0x00010000).U32(0).U32(0x5F0F3CF5)
            .U16(0x000B).U16(unitsPerEm)
            .U64(timestamp).U64(timestamp)
            .S16(xMin).S16(yMin).S16(xMax).S16(yMax)
            .U16(0).U16(8).S16(2).S16(1).S16(0);

        var hhea = new BigEndianWriter()
            .U32(0x00010000).S16(vm.HheaAscender).S16(vm.HheaDescender).S16(0)
            .U16(maxAdvance).S16(glyphs.Min(g => g.Rects.Min(r => r.X0))).S16(glyphs.Min(g => g.Advance - g.Rects.Max(r => r.X1))).S16(xMax)
            .S16(1).S16(0).S16(0).S16(0).S16(0).S16(0).S16(0).S16(0)
            .U16(numGlyphs);

        var maxp = new BigEndianWriter()
            .U32(0x00010000).U16(numGlyphs).U16(maxPoints).U16(maxContours)
            .U16(0).U16(0).U16(2).U16(0).U16(0).U16(0).U16(0).U16(0).U16(0).U16(0).U16(0);

        var os2 = new BigEndianWriter()
            .U16(4).S16((int)glyphs.Average(g => g.Advance)).U16(400).U16(5).U16(0)
            .S16(unitsPerEm / 2).S16(unitsPerEm / 2).S16(0).S16(unitsPerEm / 10)
            .S16(unitsPerEm / 2).S16(unitsPerEm / 2).S16(0).S16(unitsPerEm / 2)
            .S16(unitsPerEm / 20).S16(unitsPerEm / 4).S16(0)
            .Bytes(new byte[10])
            .U32(0).U32(1u << 28).U32(0).U32(0) // ulUnicodeRange2 bit 28 = Private Use Area
            .Bytes("NONE"u8.ToArray())
            .U16(0x0040)
            .U16(glyphs[0].Codepoint).U16(glyphs[^1].Codepoint)
            .S16(vm.TypoAscender).S16(vm.TypoDescender).S16(vm.TypoLineGap)
            .U16(vm.WinAscent).U16(vm.WinDescent)
            .U32(1).U32(0)
            .S16(unitsPerEm / 2).S16(unitsPerEm * 7 / 10).U16(0).U16(0x20).U16(0);

        var post = new BigEndianWriter().U32(0x00030000).U32(0).S16(-unitsPerEm / 10).S16(unitsPerEm / 20).U32(0).U32(0).U32(0).U32(0).U32(0);

        var tables = new SortedDictionary<string, byte[]>(StringComparer.Ordinal)
        {
            ["OS/2"] = os2.ToArray(),
            ["cmap"] = cmap,
            ["glyf"] = glyf.ToArray(),
            ["head"] = head.ToArray(),
            ["hhea"] = hhea.ToArray(),
            ["hmtx"] = hmtx.ToArray(),
            ["loca"] = loca.ToArray(),
            ["maxp"] = maxp.ToArray(),
            ["name"] = BuildName(),
            ["post"] = post.ToArray(),
        };
        return Assemble(tables);
    }

    private static byte[] BuildCmap(List<Glyph> glyphs)
    {
        var segCount = glyphs.Count + 1;
        var entrySelector = (int)Math.Floor(Math.Log2(segCount));
        var searchRange = 2 << entrySelector;
        var sub = new BigEndianWriter()
            .U16(4).U16(16 + (segCount * 8)).U16(0)
            .U16(segCount * 2).U16(searchRange).U16(entrySelector).U16((segCount * 2) - searchRange);
        foreach (var g in glyphs) sub.U16(g.Codepoint);
        sub.U16(0xFFFF).U16(0);
        foreach (var g in glyphs) sub.U16(g.Codepoint);
        sub.U16(0xFFFF);
        for (var i = 0; i < glyphs.Count; i++) sub.U16((i + 1 - glyphs[i].Codepoint) & 0xFFFF);
        sub.U16(1);
        for (var i = 0; i < segCount; i++) sub.U16(0);

        return new BigEndianWriter().U16(0).U16(1).U16(3).U16(1).U32(12).Bytes(sub.ToArray()).ToArray();
    }

    private static byte[] BuildName()
    {
        var records = new (int Id, string Value)[]
        {
            (1, FamilyName), (2, "Regular"), (3, PostScriptName), (4, FamilyName), (6, PostScriptName),
        };
        var strings = new BigEndianWriter();
        var table = new BigEndianWriter().U16(0).U16(records.Length).U16(6 + (records.Length * 12));
        foreach (var (id, value) in records)
        {
            var bytes = Encoding.BigEndianUnicode.GetBytes(value);
            table.U16(3).U16(1).U16(0x0409).U16(id).U16(bytes.Length).U16(strings.Length);
            strings.Bytes(bytes);
        }
        return table.Bytes(strings.ToArray()).ToArray();
    }

    private static byte[] Assemble(SortedDictionary<string, byte[]> tables)
    {
        var entrySelector = (int)Math.Floor(Math.Log2(tables.Count));
        var searchRange = 16 << entrySelector;
        var font = new BigEndianWriter()
            .U32(0x00010000).U16(tables.Count).U16(searchRange).U16(entrySelector).U16((tables.Count * 16) - searchRange);

        var offset = 12 + (tables.Count * 16);
        var headOffset = 0;
        foreach (var (tag, data) in tables)
        {
            if (tag == "head") headOffset = offset;
            font.Bytes(Encoding.ASCII.GetBytes(tag)).U32(Checksum(data)).U32((uint)offset).U32((uint)data.Length);
            offset += (data.Length + 3) & ~3;
        }
        foreach (var data in tables.Values)
            font.Bytes(data).Pad(4);

        var bytes = font.ToArray();
        BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(headOffset + 8), 0xB1B0AFBA - Checksum(bytes));
        return bytes;
    }

    private static uint Checksum(byte[] data)
    {
        uint sum = 0;
        for (var i = 0; i < data.Length; i += 4)
        {
            uint word = 0;
            for (var j = 0; j < 4; j++)
                word = (word << 8) | (i + j < data.Length ? data[i + j] : 0u);
            sum += word;
        }
        return sum;
    }

    private sealed class BigEndianWriter
    {
        private readonly MemoryStream _stream = new();

        public int Length => (int)_stream.Length;

        public BigEndianWriter U8(int v) { _stream.WriteByte((byte)v); return this; }
        public BigEndianWriter U16(int v) => U8(v >> 8).U8(v);
        public BigEndianWriter S16(int v) => U16(v & 0xFFFF);
        public BigEndianWriter U32(uint v) => U16((int)(v >> 16)).U16((int)(v & 0xFFFF));
        public BigEndianWriter U64(ulong v) => U32((uint)(v >> 32)).U32((uint)v);
        public BigEndianWriter Bytes(byte[] b) { _stream.Write(b); return this; }
        public BigEndianWriter Pad(int align) { while (_stream.Length % align != 0) _stream.WriteByte(0); return this; }
        public byte[] ToArray() => _stream.ToArray();
    }
}
