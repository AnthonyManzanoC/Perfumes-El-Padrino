using System.Buffers.Binary;

namespace PerfumesElPadrino.Api.Services;

internal static class ProofImage
{
    public static string? Detect(ReadOnlySpan<byte> data)
    {
        if (data.Length >= 45 && data[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) &&
            data[8..12].SequenceEqual(new byte[] { 0, 0, 0, 13 }) && data[12..16].SequenceEqual("IHDR"u8) &&
            IsSizeValid(BinaryPrimitives.ReadUInt32BigEndian(data[16..20]), BinaryPrimitives.ReadUInt32BigEndian(data[20..24])) &&
            data[^12..^4].SequenceEqual(new byte[] { 0, 0, 0, 0, 73, 69, 78, 68 }))
            return "image/png";

        if (data.Length >= 30 && data[..4].SequenceEqual("RIFF"u8) && data[8..12].SequenceEqual("WEBP"u8) &&
            BinaryPrimitives.ReadUInt32LittleEndian(data[4..8]) == data.Length - 8 &&
            BinaryPrimitives.ReadUInt32LittleEndian(data[16..20]) <= data.Length - 20 &&
            (data[12..16].SequenceEqual("VP8 "u8) || data[12..16].SequenceEqual("VP8L"u8) || data[12..16].SequenceEqual("VP8X"u8)))
            return "image/webp";

        if (data.Length >= 20 && data[..2].SequenceEqual(new byte[] { 255, 216 }) &&
            data[^2..].SequenceEqual(new byte[] { 255, 217 }) && JpegHasFrame(data))
            return "image/jpeg";

        return null;
    }

    private static bool IsSizeValid(uint width, uint height) =>
        width is > 0 and <= 12_000 && height is > 0 and <= 12_000 && (ulong)width * height <= 48_000_000;

    private static bool JpegHasFrame(ReadOnlySpan<byte> data)
    {
        for (var offset = 2; offset + 4 < data.Length;)
        {
            if (data[offset++] != 255) return false;
            while (offset < data.Length && data[offset] == 255) offset++;
            if (offset + 2 >= data.Length) return false;
            var marker = data[offset++];
            var length = BinaryPrimitives.ReadUInt16BigEndian(data.Slice(offset, 2));
            if (length < 2 || offset + length > data.Length) return false;
            if (marker is >= 0xc0 and <= 0xcf and not (0xc4 or 0xc8 or 0xcc))
                return length >= 8 && IsSizeValid(BinaryPrimitives.ReadUInt16BigEndian(data.Slice(offset + 5, 2)),
                    BinaryPrimitives.ReadUInt16BigEndian(data.Slice(offset + 3, 2)));
            if (marker == 0xda) return false;
            offset += length;
        }
        return false;
    }
}
