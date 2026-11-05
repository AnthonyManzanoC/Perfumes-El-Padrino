using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Services;

public sealed class GreenApiWhatsApp(HttpClient client, IConfiguration config, IWebHostEnvironment environment, IMemoryCache cache)
{
    public static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Any(c => !char.IsAsciiDigit(c) && !char.IsWhiteSpace(c) && c is not ('+' or '-' or '(' or ')')))
            return "";
        var digits = new string(phone.Where(char.IsAsciiDigit).ToArray());
        if (digits.StartsWith('0')) digits = "593" + digits[1..];
        return digits.Length is >= 8 and <= 15 ? digits : "";
    }

    public bool Configured => Endpoint("sendMessage") is not null && NormalizePhone(config["GREEN_API_SENDER_PHONE"]) != "";
    public string Primary(CommerceSettings settings) => NormalizePhone(settings.WhatsAppPrimary ??
        config["WHATSAPP_OWNER_PHONE"] ?? config["WHATSAPP_DEFAULT_ADMIN_PHONE"]);

    public bool Enabled(CommerceSettings settings) => settings.WhatsAppEnabled ||
        (settings.WhatsAppPrimary is null && Configured && Permitted(Primary(settings)));

    public bool Permitted(string phone)
    {
        if (phone == "" || phone == NormalizePhone(config["GREEN_API_SENDER_PHONE"])) return false;
        var locked = config["WHATSAPP_TEST_ONLY_PHONE"];
        return string.IsNullOrWhiteSpace(locked)
            ? !environment.IsDevelopment()
            : phone == NormalizePhone(locked);
    }

    public IEnumerable<string> Recipients(CommerceSettings settings) =>
        new[] { Primary(settings), NormalizePhone(settings.WhatsAppSecondary) }.Where(Permitted).Distinct();

    public static string? CustomerChat(Order order, string? status = null)
    {
        var phone = NormalizePhone(order.CustomerPhone);
        if (phone == "") return null;
        var total = Money(order.Total);
        var greeting = (status ?? order.Status) switch
        {
            "Enviado" => $"Hola {order.CustomerName}, tu pedido #{order.OrderNumber} ya fue despachado. Te escribo de la tienda de perfumes para coordinar la entrega.",
            "Entregado" => $"Hola {order.CustomerName}, tu pedido #{order.OrderNumber} figura como entregado. Gracias por comprar en nuestra tienda de perfumes.",
            _ => $"Hola {order.CustomerName}, te escribo de la tienda de perfumes por tu pedido #{order.OrderNumber} (Total: ${total}) para coordinar el pago y el envío."
        };
        if ((status ?? order.Status) == "Enviado")
        {
            if (!string.IsNullOrWhiteSpace(order.City)) greeting += $" Destino: {order.City}.";
            if (!string.IsNullOrWhiteSpace(order.Carrier)) greeting += $" Transportadora: {order.Carrier}.";
            if (!string.IsNullOrWhiteSpace(order.TrackingNumber)) greeting += $" Guía: {order.TrackingNumber}.";
            if (!string.IsNullOrWhiteSpace(order.TrackingUrl)) greeting += $" Seguimiento: {order.TrackingUrl}";
        }
        return $"https://wa.me/{phone}?text={Uri.EscapeDataString(greeting)}";
    }

    public static string FormatOrder(Order order, OrderEvent evt, string? quickLink)
    {
        var items = string.Join("\n", order.Items.OrderBy(x => x.Id).Select(i =>
            $"{i.Quantity} × {i.ProductName} · ${Money(i.UnitPrice)} c/u · ${Money(i.UnitPrice * i.Quantity)}"));
        var body = evt.Status == "Cancelado"
            ? $"Pedido #{order.OrderNumber} de {order.CustomerName}: Cancelado.\n{evt.Message}"
            : $"Pedido #{order.OrderNumber} · {evt.Status}\n{evt.Message}\nCliente: {order.CustomerName}\nCorreo: {order.CustomerEmail}\nTeléfono: {order.CustomerPhone}\nEntrega: {order.ShippingAddress}, {order.City}\nIndicaciones: {order.Notes}\nPago: transferencia bancaria\n{items}\nTotal: ${Money(order.Total)} {order.Currency}";
        if (quickLink is not null) body += $"\n{(evt.Status == "En verificación" ? "Ver comprobante y gestionar" : "Gestionar pedido")}: {quickLink}";
        var chat = CustomerChat(order, evt.Status);
        return chat is null ? body : body + $"\nContactar al cliente: {chat}";
    }

    private static string Money(decimal amount) => amount.ToString("0.00", CultureInfo.InvariantCulture);

    private Uri? Endpoint(string method)
    {
        var id = config["GREEN_API_ID_INSTANCE"];
        var token = config["GREEN_API_TOKEN"];
        if (string.IsNullOrWhiteSpace(id) || !id.All(char.IsAsciiDigit) ||
            string.IsNullOrWhiteSpace(token) || !token.All(char.IsAsciiLetterOrDigit) ||
            !Uri.TryCreate(config["GREEN_API_URL"], UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps ||
            !uri.IsDefaultPort || uri.PathAndQuery != "/" || uri.UserInfo != "" || uri.Fragment != "" ||
            !(uri.Host.EndsWith(".green-api.com", StringComparison.OrdinalIgnoreCase) ||
              uri.Host.EndsWith(".greenapi.com", StringComparison.OrdinalIgnoreCase)))
            return null;
        return new Uri(uri, $"waInstance{id}/{method}/{token}");
    }

    // Return only safe diagnostics. Provider URLs contain the token.
    public async Task<(bool Accepted, string Message, bool Retry)> SendAsync(string phone, string message, CancellationToken ct)
    {
        var send = Endpoint("sendMessage");
        var account = Endpoint("getWaSettings");
        var expectedSender = NormalizePhone(config["GREEN_API_SENDER_PHONE"]);
        if (send is null || account is null || expectedSender == "")
            return (false, "Configura la instancia y el número emisor de GREEN-API.", true);
        if (!Permitted(phone) || phone == expectedSender)
            return (false, "El destinatario no está habilitado para esta instancia.", false);

        var sending = false;
        try
        {
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
            deadline.CancelAfter(TimeSpan.FromSeconds(10));
            var token = deadline.Token;
            var verificationKey = ("green-sender", account, expectedSender);
            if (!cache.TryGetValue(verificationKey, out _))
            {
                using var check = await client.GetAsync(account, token);
                if (!check.IsSuccessStatusCode)
                    return (false, $"GREEN-API rechazó la verificación de la cuenta (HTTP {(int)check.StatusCode}).", true);
                var profile = await check.Content.ReadFromJsonAsync<JsonElement>(token);
                if (!profile.TryGetProperty("stateInstance", out var state) || state.GetString() != "authorized")
                    return (false, "Autoriza el WhatsApp secundario en GREEN-API.", true);
                if (!profile.TryGetProperty("phone", out var sender) || NormalizePhone(sender.GetString()) != expectedSender)
                    return (false, "El teléfono vinculado no coincide con el emisor configurado.", false);
                cache.Set(verificationKey, true, TimeSpan.FromMinutes(1));
            }

            sending = true;
            using var sent = await client.PostAsJsonAsync(send, new { chatId = phone + "@c.us", message, linkPreview = false }, token);
            if (!sent.IsSuccessStatusCode)
                return (false, $"GREEN-API rechazó el mensaje (HTTP {(int)sent.StatusCode}).", (int)sent.StatusCode is 429 or >= 500);
            var result = await sent.Content.ReadFromJsonAsync<JsonElement>(token);
            return result.TryGetProperty("idMessage", out var id) && id.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(id.GetString())
                ? (true, "GREEN-API aceptó el mensaje para envío.", false)
                : (false, "GREEN-API no confirmó la recepción del mensaje.", false);
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            return (false, sending ? "Envío sin confirmación. Revisa WhatsApp antes de repetirlo."
                : "No se pudo verificar la instancia de GREEN-API.", !sending);
        }
    }
}
