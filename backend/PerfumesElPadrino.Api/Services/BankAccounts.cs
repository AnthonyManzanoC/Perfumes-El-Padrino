using System.Text.Json;
using System.Text.RegularExpressions;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Services;

public sealed record PaymentDetails(List<BankAccountRequest> Accounts, string Instructions);
public static class BankAccounts
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static PaymentDetails FromSettings(CommerceSettings s) => s.BankAccountsJson is not null
        ? new(JsonSerializer.Deserialize<List<BankAccountRequest>>(s.BankAccountsJson, Json) ?? [], s.PaymentInstructions)
        : Legacy($"{s.BankName}\n{s.AccountType}\nCuenta: {s.AccountNumber}\nTitular: {s.AccountHolder}\nIdentificación: {s.Identification}\n{s.PaymentInstructions}");
    public static string Serialize(List<BankAccountRequest> accounts) => JsonSerializer.Serialize(accounts, Json);
    public static string Snapshot(CommerceSettings settings) => JsonSerializer.Serialize(FromSettings(settings), Json);
    public static PaymentDetails ReadSnapshot(string snapshot)
    {
        if (snapshot.TrimStart().StartsWith('{'))
        {
            try { return JsonSerializer.Deserialize<PaymentDetails>(snapshot, Json) ?? new([], snapshot); }
            catch (JsonException) { return new([], snapshot); }
        }
        return Legacy(snapshot);
    }
    private static PaymentDetails Legacy(string snapshot)
    {
        var lines = snapshot.Replace("\r", "").Split('\n');
        if (lines.Length < 5 || !lines[2].StartsWith("Cuenta:")) return new([], snapshot);
        var primary = new BankAccountRequest { BankName = lines[0], AccountType = lines[1], AccountNumber = lines[2][7..].Trim(), AccountHolder = lines[3].Replace("Titular:", "").Trim(), Identification = lines[4].Replace("Identificación:", "").Trim() };
        var accounts = new List<BankAccountRequest> { primary };
        var instructions = new List<string>();
        foreach (var line in lines.Skip(5))
        {
            var match = Regex.Match(line, @"^\s*[•·-]?\s*(Banco[^:]+):\s*([^#]+)#\s*([\d -]+)\s*\(C\.?I\.?\s*([\d-]+)\)", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var number = match.Groups[3].Value.Trim();
                if (!accounts.Any(a => a.AccountNumber.Replace(" ", "") == number.Replace(" ", ""))) accounts.Add(new() { BankName = match.Groups[1].Value.Trim(), AccountType = match.Groups[2].Value.Trim(), AccountNumber = number, AccountHolder = primary.AccountHolder, Identification = match.Groups[4].Value.Trim() });
            }
            else if (!line.Contains("Cuentas disponibles", StringComparison.OrdinalIgnoreCase) && !line.TrimStart().StartsWith("Titular:", StringComparison.OrdinalIgnoreCase)) instructions.Add(line);
        }
        return new(accounts, string.Join('\n', instructions).Trim());
    }
}
