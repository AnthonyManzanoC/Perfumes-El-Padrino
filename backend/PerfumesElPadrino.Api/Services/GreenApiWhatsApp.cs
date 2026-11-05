using System.Globalization;
using System.Net.Http.Headers;
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
        var name = OneLine(order.CustomerName);
        var total = Money(order.Total);
        var greeting = (status ?? order.Status) switch
        {
            "Enviado" => $"Hola, {name} 👋\n\nTu pedido {order.OrderNumber} de Perfumes El Padrino ya fue despachado.",
            "Entregado" => $"Hola, {name} 👋\n\nTu pedido {order.OrderNumber} figura como entregado. Gracias por elegir Perfumes El Padrino.",
            "Cancelado" => $"Hola, {name} 👋\n\nTe escribimos de Perfumes El Padrino sobre el pedido {order.OrderNumber} para resolver cualquier duda.",
            "En verificación" => $"Hola, {name} 👋\n\nRecibimos el comprobante de tu pedido {order.OrderNumber}. Te avisaremos después de verificar el ingreso.",
            _ => $"Hola, {name} 👋\n\nTe escribimos de Perfumes El Padrino por tu pedido {order.OrderNumber} (total: {total}). Estamos para ayudarte con el pago y la entrega."
        };
        if ((status ?? order.Status) == "Enviado")
        {
            if (!string.IsNullOrWhiteSpace(order.City)) greeting += $"\n📍 Destino: {OneLine(order.City)}";
            if (!string.IsNullOrWhiteSpace(order.Carrier)) greeting += $"\n🚚 Transportadora: {OneLine(order.Carrier)}";
            if (!string.IsNullOrWhiteSpace(order.TrackingNumber)) greeting += $"\n🔢 Guía: {OneLine(order.TrackingNumber)}";
            if (!string.IsNullOrWhiteSpace(order.TrackingUrl)) greeting += $"\n\nSigue tu envío aquí:\n{order.TrackingUrl}";
        }
        return $"https://wa.me/{phone}?text={Uri.EscapeDataString(greeting)}";
    }

    public static string FormatOrder(Order order, OrderEvent evt, string? quickLink)
    {
        var (title, nextStep) = evt.Status switch
        {
            "Pendiente de pago" => ("🛍️ Nuevo pedido", "La reserva está activa. El cliente debe transferir y subir el comprobante."),
            "En verificación" => ("🧾 Comprobante recibido", "Revisa la foto y confirma el ingreso en tu banco antes de aprobar el pago."),
            "Enviado" => ("📦 Pedido despachado", "El envío quedó registrado. Marca la entrega cuando el cliente lo reciba."),
            "Entregado" => ("✅ Pedido entregado", "El pedido quedó cerrado."),
            "Cancelado" => ("⚪ Pedido cancelado", OneLine(evt.Message)),
            _ => ("📋 Pedido actualizado", OneLine(evt.Message))
        };

        var blocks = new List<string>
        {
            $"✨ *PERFUMES EL PADRINO*\n*{title}*\nPedido: {order.OrderNumber}",
            nextStep,
            $"👤 *Cliente*\n{OneLine(order.CustomerName)}\n{OneLine(order.CustomerPhone)}"
        };
        if (quickLink is not null) blocks.Add($"🔐 *Abrir pedido en la tienda*\n{quickLink}");
        if (CustomerChat(order, evt.Status) is { } chat) blocks.Add($"💬 *Hablar con el cliente*\n{chat}");

        if (evt.Status == "Pendiente de pago")
        {
            if (!string.IsNullOrWhiteSpace(order.CustomerEmail)) blocks[2] += $"\n{OneLine(order.CustomerEmail)}";
            var destination = string.Join(", ", new[] { order.ShippingAddress, order.City }
                .Where(s => !string.IsNullOrWhiteSpace(s)).Select(OneLine));
            if (destination.Length > 0) blocks.Add($"📍 *Entrega*\n{destination}");
            if (!string.IsNullOrWhiteSpace(order.Notes)) blocks.Add($"📝 *Indicaciones*\n{OneLine(order.Notes)}");
            var items = string.Join("\n", order.Items.OrderBy(x => x.ProductName).Select(i =>
                i.Quantity == 1
                    ? $"• {i.Quantity} × {OneLine(i.ProductName)} · {Money(i.UnitPrice)}"
                    : $"• {i.Quantity} × {OneLine(i.ProductName)} · {Money(i.UnitPrice)} c/u"));
            blocks.Add($"🛒 *Selección*\n{items}");
        }

        if (evt.Status == "Enviado")
        {
            var shipping = new[] { order.Carrier, order.TrackingNumber is { Length: > 0 } guide ? $"Guía: {guide}" : null }
                .Where(s => !string.IsNullOrWhiteSpace(s)).Select(OneLine);
            var detail = string.Join("\n", shipping);
            if (detail.Length > 0) blocks.Add($"🚚 *Envío*\n{detail}");
            if (order.TrackingUrl is { Length: > 0 } tracking) blocks.Add($"📍 *Seguir envío*\n{tracking}");
        }

        blocks.Add(evt.Status == "Pendiente de pago"
            ? $"💳 *Total: {Money(order.Total)} {order.Currency}*\nPago por transferencia bancaria"
            : $"💳 *Total: {Money(order.Total)} {order.Currency}*");
        return string.Join("\n\n", blocks.Where(s => s.Length > 0));
    }

    public static string ProofCaption(string orderNumber, string? quickLink)
    {
        var caption = $"🧾 *Comprobante de transferencia*\nPedido: {orderNumber}\n\nPendiente de verificación bancaria.";
        return quickLink is not null && caption.Length + quickLink.Length + 32 <= 1024
            ? $"{caption}\n\n🔐 *Abrir pedido*\n{quickLink}" : caption;
    }

    private static string OneLine(string? value) => string.Join(' ', (value ?? "").Split(
        (char[]?)null, StringSplitOptions.RemoveEmptyEntries)).Replace("*", "").Replace("_", "").Replace("~", "").Replace((char)96, ' ');

    private static string Money(decimal amount) => "$" + amount.ToString("N2", CultureInfo.GetCultureInfo("es-EC"));

    private Uri? Endpoint(string method, string? baseUrl = null)
    {
        var id = config["GREEN_API_ID_INSTANCE"];
        var token = config["GREEN_API_TOKEN"];
        if (string.IsNullOrWhiteSpace(id) || !id.All(char.IsAsciiDigit) ||
            string.IsNullOrWhiteSpace(token) || !token.All(char.IsAsciiLetterOrDigit) ||
            !Uri.TryCreate(baseUrl ?? config["GREEN_API_URL"], UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps ||
            !uri.IsDefaultPort || uri.PathAndQuery != "/" || uri.UserInfo != "" || uri.Fragment != "" ||
            !(uri.Host.EndsWith(".green-api.com", StringComparison.OrdinalIgnoreCase) ||
              uri.Host.EndsWith(".greenapi.com", StringComparison.OrdinalIgnoreCase)))
            return null;
        return new Uri(uri, $"waInstance{id}/{method}/{token}");
    }

    public Task<(bool Accepted, string Message, bool Retry)> SendAsync(string phone, string message, CancellationToken ct) =>
        DeliverAsync(phone, Endpoint("sendMessage"),
            JsonContent.Create(new { chatId = phone + "@c.us", message, linkPreview = false }), "mensaje", TimeSpan.FromSeconds(10), ct);

    public Task<(bool Accepted, string Message, bool Retry)> SendProofAsync(
        string phone, string orderNumber, PaymentProof proof, string caption, CancellationToken ct)
    {
        var extension = proof.ContentType switch
        {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            _ => null
        };
        if (extension is null || proof.Content.Length is < 16 or > 2_000_000)
            return Task.FromResult((false, "El comprobante no tiene un formato de imagen admitido.", false));

        var name = $"comprobante-{orderNumber}.{extension}";
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(phone + "@c.us"), "chatId");
        form.Add(new StringContent(name), "fileName");
        form.Add(new StringContent(caption), "caption");
        var image = new ByteArrayContent(proof.Content);
        image.Headers.ContentType = new MediaTypeHeaderValue(proof.ContentType);
        form.Add(image, "file", name);
        var mediaUrl = config["GREEN_API_MEDIA_URL"];
        return DeliverAsync(phone, Endpoint("sendFileByUpload", string.IsNullOrWhiteSpace(mediaUrl) ? null : mediaUrl),
            form, "comprobante", TimeSpan.FromSeconds(35), ct);
    }

    // Return only safe diagnostics. Provider URLs contain the token.
    private async Task<(bool Accepted, string Message, bool Retry)> DeliverAsync(
        string phone, Uri? send, HttpContent payload, string kind, TimeSpan timeout, CancellationToken ct)
    {
        using var content = payload;
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
            deadline.CancelAfter(timeout);
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
            using var sent = await client.PostAsync(send, content, token);
            if (!sent.IsSuccessStatusCode)
                return (false, $"GREEN-API rechazó el {kind} (HTTP {(int)sent.StatusCode}).", (int)sent.StatusCode is 429 or >= 500);
            var result = await sent.Content.ReadFromJsonAsync<JsonElement>(token);
            return result.TryGetProperty("idMessage", out var id) && id.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(id.GetString())
                ? (true, $"GREEN-API aceptó el {kind} para envío.", false)
                : (false, "GREEN-API no confirmó la recepción del mensaje.", false);
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            return (false, sending ? "Envío sin confirmación. Revisa WhatsApp antes de repetirlo."
                : "No se pudo verificar la instancia de GREEN-API.", !sending);
        }
    }
}
