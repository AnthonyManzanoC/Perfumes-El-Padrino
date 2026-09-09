using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace PerfumesElPadrino.Api.Utilities;

public static partial class TextTools
{
    public static string Slugify(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(character);
        }

        var cleaned = NonSlugCharacters().Replace(builder.ToString().ToLowerInvariant(), "-").Trim('-');
        return MultipleDashes().Replace(cleaned, "-");
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugCharacters();

    [GeneratedRegex("-+")]
    private static partial Regex MultipleDashes();
}
