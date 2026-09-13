using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;
internal static class BankAccountsTests
{
    public static void Run()
    {
        var settings = new CommerceSettings { BankName = "Banco Uno", AccountType = "Ahorros", AccountNumber = "00123", AccountHolder = "Titular de prueba", Identification = "1234567890", PaymentInstructions = "Transfiere el total.\nCuentas disponibles:\n• Banco Uno: Ahorros # 00123 (C.I. 1234567890)\n• Banco Dos: Ahorros # 00456 (C.I. 1234567890)\nTitular: Titular de prueba.\nSube tu comprobante." };
        var legacy = BankAccounts.FromSettings(settings);
        if (legacy.Accounts.Count != 2 || legacy.Accounts[1].AccountNumber != "00456" || legacy.Instructions.Contains("Banco Dos") || !legacy.Instructions.Contains("Sube tu comprobante")) throw new Exception("Legacy bank conversion failed");
        settings.BankAccountsJson = BankAccounts.Serialize(legacy.Accounts);
        settings.PaymentInstructions = legacy.Instructions;
        var snapshot = BankAccounts.Snapshot(settings);
        settings.AccountNumber = "changed";
        if (BankAccounts.ReadSnapshot(snapshot).Accounts[0].AccountNumber != "00123") throw new Exception("Bank snapshot changed");
        if (BankAccounts.ReadSnapshot("Instrucción antigua sin formato").Instructions != "Instrucción antigua sin formato") throw new Exception("Legacy text lost");
        Console.WriteLine("Bank account compatibility checks passed (3).");
    }
}
