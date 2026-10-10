using System.Buffers.Binary;
using System.Text;
using Dalamud.Plugin.Services;
using Lumina.Data.Files;

namespace ChatAnywhere.Core;

internal static class SymbolFontBuilder
{
    public const string FdtPath = "common/font/AXIS_36.fdt";
    // Bump when the output changes for the same inputs, so cached fonts get rebuilt.
    public const int Version = 1;
    private const int PuaStart = 0xE000;
    private const int PuaEnd = 0xF8FF;
    // Present in both fonts with the same design; used to map game pixels onto Lodestone units.
    private const int ReferenceCodepoint = 0xE08F;

    // FDT layout and texture channel order based on Dalamud: https://github.com/goatcorp/Dalamud/blob/master/Dalamud/Interface/GameFonts/FdtReader.cs
    private static readonly int[] TextureChannelOrder = [2, 1, 0, 3];

    private record FdtGlyph(int Codepoint, int TextureIndex, int TexX, int TexY, int Width, int Height, int NextOffsetX, int OffsetY);

    private record Bitmap(bool[,] Ink, int MinX, int MinY, int MaxX, int MaxY);

    public static byte[]? Build(IDataManager data, byte[] fdt, byte[] lodestoneFont, IPluginLog log)
    {
        var lodestone = new TtfReader(lodestoneFont);
        var glyphs = ReadFdt(fdt);

        var missing = glyphs.Where(g => !lodestone.HasGlyph(g.Codepoint)).ToList();
        if (missing.Count == 0)
            return null;

        var reference = glyphs.FirstOrDefault(g => g.Codepoint == ReferenceCodepoint);
        var refBox = lodestone.GetGlyphBounds(ReferenceCodepoint);
        if (reference == null || refBox == null)
        {
            log.Warning("[SymbolFont] Reference glyph not found; skipping.");
            return null;
        }

        var textures = new Dictionary<int, TexFile>();
        Bitmap Rasterize(FdtGlyph g)
        {
            var fileIndex = g.TextureIndex / 4;
            if (!textures.TryGetValue(fileIndex, out var tex))
                textures[fileIndex] = tex = data.GetFile<TexFile>($"common/font/font{fileIndex + 1}.tex")!;
            var pixels = tex.ImageData;
            var stride = tex.Header.Width;
            var channel = TextureChannelOrder[g.TextureIndex % 4];

            var ink = new bool[g.Width, g.Height];
            int minX = int.MaxValue, minY = int.MaxValue, maxX = -1, maxY = -1;
            for (var y = 0; y < g.Height; y++)
            for (var x = 0; x < g.Width; x++)
            {
                if (pixels[(((g.TexY + y) * stride) + g.TexX + x) * 4 + channel] < 128)
                    continue;
                ink[x, y] = true;
                minX = Math.Min(minX, x);
                minY = Math.Min(minY, y);
                maxX = Math.Max(maxX, x);
                maxY = Math.Max(maxY, y);
            }
            return new Bitmap(ink, minX, minY, maxX, maxY);
        }

        var refBitmap = Rasterize(reference);
        var (rxMin, ryMin, rxMax, ryMax, refAdvance) = refBox.Value;
        var scaleX = (double)(rxMax - rxMin) / (refBitmap.MaxX + 1 - refBitmap.MinX);
        var scaleY = (double)(ryMax - ryMin) / (refBitmap.MaxY + 1 - refBitmap.MinY);
        var refTop = reference.OffsetY + refBitmap.MinY;
        var refGameAdvance = reference.Width + reference.NextOffsetX;

        var outGlyphs = new List<TtfWriter.Glyph>();
        foreach (var g in missing)
        {
            var bitmap = Rasterize(g);
            var rects = new List<(int X0, int Y0, int X1, int Y1)>();
            foreach (var (x0, row0, x1, row1) in MergeRuns(bitmap.Ink, g.Width, g.Height))
            {
                rects.Add((
                    (int)Math.Round(((x0 - refBitmap.MinX) * scaleX) + rxMin),
                    (int)Math.Round(((refTop - (g.OffsetY + row1)) * scaleY) + ryMax),
                    (int)Math.Round(((x1 - refBitmap.MinX) * scaleX) + rxMin),
                    (int)Math.Round(((refTop - (g.OffsetY + row0)) * scaleY) + ryMax)));
            }
            var advance = (int)Math.Round(refAdvance + ((g.Width + g.NextOffsetX - refGameAdvance) * scaleX));
            outGlyphs.Add(new TtfWriter.Glyph(g.Codepoint, advance, rects));
        }

        log.Info($"[SymbolFont] Built {outGlyphs.Count} glyphs: {string.Join(" ", outGlyphs.Select(g => $"{g.Codepoint:X}"))}");
        return TtfWriter.Write(outGlyphs, lodestone.UnitsPerEm, lodestone.VerticalMetrics);
    }

    private static List<FdtGlyph> ReadFdt(byte[] fdt)
    {
        var header = BitConverter.ToInt32(fdt, 0x08);
        var count = BitConverter.ToInt32(fdt, header + 0x04);
        var result = new List<FdtGlyph>();
        for (var i = 0; i < count; i++)
        {
            var o = header + 0x20 + (i * 16);
            var utf8 = new[] { fdt[o + 3], fdt[o + 2], fdt[o + 1], fdt[o] }.SkipWhile(b => b == 0).ToArray();
            var text = Encoding.UTF8.GetString(utf8);
            if (text.Length != 1 || text[0] < PuaStart || text[0] > PuaEnd)
                continue;
            result.Add(new FdtGlyph(
                text[0],
                BitConverter.ToUInt16(fdt, o + 6),
                BitConverter.ToUInt16(fdt, o + 8),
                BitConverter.ToUInt16(fdt, o + 10),
                fdt[o + 12],
                fdt[o + 13],
                (sbyte)fdt[o + 14],
                (sbyte)fdt[o + 15]));
        }
        return result;
    }

    private static IEnumerable<(int X0, int Row0, int X1, int Row1)> MergeRuns(bool[,] ink, int width, int height)
    {
        var open = new Dictionary<(int, int), int>();
        for (var y = 0; y <= height; y++)
        {
            var runs = new HashSet<(int, int)>();
            for (var x = 0; y < height && x < width; x++)
            {
                if (!ink[x, y]) continue;
                var start = x;
                while (x < width && ink[x, y]) x++;
                runs.Add((start, x));
            }

            foreach (var (run, startRow) in open.ToList())
            {
                if (runs.Contains(run)) continue;
                open.Remove(run);
                yield return (run.Item1, startRow, run.Item2, y);
            }
            foreach (var run in runs)
                open.TryAdd(run, y);
        }
    }

    private sealed class TtfReader
    {
        private readonly byte[] _data;
        private readonly Dictionary<string, int> _tables = new();
        private readonly Dictionary<int, int> _cmap = new();

        public TtfReader(byte[] data)
        {
            _data = data;
            var numTables = U16(4);
            for (var i = 0; i < numTables; i++)
            {
                var rec = 12 + (i * 16);
                _tables[Encoding.ASCII.GetString(_data, rec, 4)] = (int)U32(rec + 8);
            }
            ReadCmap();
        }

        public int UnitsPerEm => U16(_tables["head"] + 18);

        public TtfWriter.VerticalMetrics VerticalMetrics
        {
            get
            {
                var hhea = _tables["hhea"];
                var os2 = _tables["OS/2"];
                return new TtfWriter.VerticalMetrics(
                    S16(hhea + 4), S16(hhea + 6),
                    S16(os2 + 68), S16(os2 + 70), S16(os2 + 72),
                    U16(os2 + 74), U16(os2 + 76));
            }
        }

        public bool HasGlyph(int codepoint) => _cmap.TryGetValue(codepoint, out var gid) && gid != 0;

        public (int XMin, int YMin, int XMax, int YMax, int Advance)? GetGlyphBounds(int codepoint)
        {
            if (!_cmap.TryGetValue(codepoint, out var gid)) return null;
            var head = _tables["head"];
            var loca = _tables["loca"];
            var offset = S16(head + 50) == 0 ? U16(loca + (gid * 2)) * 2 : (int)U32(loca + (gid * 4));
            var glyph = _tables["glyf"] + offset;
            var numberOfHMetrics = U16(_tables["hhea"] + 34);
            var advance = U16(_tables["hmtx"] + (Math.Min(gid, numberOfHMetrics - 1) * 4));
            return (S16(glyph + 2), S16(glyph + 4), S16(glyph + 6), S16(glyph + 8), advance);
        }

        private void ReadCmap()
        {
            var start = _tables["cmap"];
            var count = U16(start + 2);
            for (var i = 0; i < count; i++)
            {
                var rec = start + 4 + (i * 8);
                if (U16(rec) != 3) continue;
                var sub = start + (int)U32(rec + 4);
                switch (U16(sub))
                {
                    case 4: ReadFormat4(sub); return;
                    case 12: ReadFormat12(sub); return;
                }
            }
        }

        private void ReadFormat4(int sub)
        {
            var segCount = U16(sub + 6) / 2;
            var ends = sub + 14;
            var starts = ends + (segCount * 2) + 2;
            var deltas = starts + (segCount * 2);
            var rangeOffsets = deltas + (segCount * 2);
            for (var s = 0; s < segCount; s++)
            {
                int first = U16(starts + (s * 2)), last = U16(ends + (s * 2));
                var delta = S16(deltas + (s * 2));
                var rangeOffsetPos = rangeOffsets + (s * 2);
                var rangeOffset = U16(rangeOffsetPos);
                for (var c = Math.Max(first, PuaStart); c <= Math.Min(last, PuaEnd); c++)
                {
                    var gid = rangeOffset == 0
                        ? (c + delta) & 0xFFFF
                        : U16(rangeOffsetPos + rangeOffset + ((c - first) * 2));
                    if (rangeOffset != 0 && gid != 0) gid = (gid + delta) & 0xFFFF;
                    _cmap[c] = gid;
                }
            }
        }

        private void ReadFormat12(int sub)
        {
            var groups = U32(sub + 12);
            for (var i = 0; i < groups; i++)
            {
                var g = sub + 16 + (i * 12);
                long first = U32(g), last = U32(g + 4), startGid = U32(g + 8);
                for (var c = Math.Max(first, PuaStart); c <= Math.Min(last, PuaEnd); c++)
                    _cmap[(int)c] = (int)(startGid + c - first);
            }
        }

        private int U16(int o) => BinaryPrimitives.ReadUInt16BigEndian(_data.AsSpan(o));
        private short S16(int o) => BinaryPrimitives.ReadInt16BigEndian(_data.AsSpan(o));
        private uint U32(int o) => BinaryPrimitives.ReadUInt32BigEndian(_data.AsSpan(o));
    }
}
