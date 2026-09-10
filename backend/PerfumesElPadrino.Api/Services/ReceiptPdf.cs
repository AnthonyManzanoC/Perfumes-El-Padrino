using PerfumesElPadrino.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PerfumesElPadrino.Api.Services;

public static class ReceiptPdf
{
    public static byte[] Create(Order order, string storeName)
    {
        var paid = order.PaidAt is not null;
        string Money(decimal value) => $"{order.Currency} {value:0.00}";
        return Document.Create(document => document.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(38);
            page.DefaultTextStyle(x => x.FontSize(10).FontColor("#27251F"));
            page.Header().Repeat().ShowEntire().Background("#15130F").Padding(22).Column(column =>
            {
                column.Item().Text(storeName.ToUpperInvariant()).FontSize(20).SemiBold().FontColor("#D8B96E");
                column.Item().PaddingTop(8).Text(paid ? "RECIBO DE COMPRA" : "RESUMEN DEL PEDIDO").FontSize(12).FontColor(Colors.White);
                column.Item().PaddingTop(4).Text(order.OrderNumber).FontColor(Colors.White);
            });
            page.Content().PaddingTop(24).Column(column =>
            {
                column.Spacing(10);
                column.Item().Text($"Estado: {order.Status}").SemiBold();
                column.Item().Text($"Fecha del pedido (UTC): {order.CreatedAt:dd/MM/yyyy HH:mm}");
                if (order.PaidAt is not null) column.Item().Text($"Pago verificado (UTC): {order.PaidAt:dd/MM/yyyy HH:mm}");
                column.Item().PaddingVertical(10).Column(customer =>
                {
                    customer.Item().Text(order.CustomerName).FontSize(13).SemiBold();
                    customer.Item().Text(order.CustomerEmail);
                    customer.Item().Text(order.CustomerPhone);
                    customer.Item().Text($"{order.ShippingAddress} - {order.City}");
                });
                column.Item().Table(table =>
                {
                    table.ColumnsDefinition(c => { c.RelativeColumn(5); c.ConstantColumn(40); c.RelativeColumn(2); c.RelativeColumn(2); });
                    table.Header(h => { foreach (var label in new[] { "Perfume", "Cant.", "Precio", "Importe" }) h.Cell().Background("#F1EBDD").Padding(8).Text(label).SemiBold(); });
                    foreach (var item in order.Items)
                    {
                        table.Cell().ShowEntire().BorderBottom(0.5f).BorderColor("#E8E3D9").Padding(8).Text(item.ProductName);
                        table.Cell().ShowEntire().Padding(8).Text(item.Quantity.ToString());
                        table.Cell().ShowEntire().Padding(8).Text(Money(item.UnitPrice));
                        table.Cell().ShowEntire().Padding(8).Text(Money(item.UnitPrice * item.Quantity));
                    }
                });
                column.Item().AlignRight().Text($"Subtotal: {Money(order.Subtotal)}");
                column.Item().AlignRight().Text(order.ShippingTotal == 0 ? "Envío: Gratis" : $"Envío: {Money(order.ShippingTotal)}");
                column.Item().AlignRight().Text($"TOTAL: {Money(order.Total)}").FontSize(18).SemiBold();
                column.Item().PaddingTop(12).Text(paid
                    ? "Pago por transferencia verificado por la tienda. Este recibo de compra no sustituye una factura tributaria."
                    : "PAGO PENDIENTE DE VERIFICACIÓN. Este resumen no acredita que el dinero haya sido recibido.").FontSize(10);
                if (!string.IsNullOrEmpty(order.Carrier)) column.Item().Text($"Transporte: {order.Carrier} | Guía: {order.TrackingNumber}");
                if (!string.IsNullOrEmpty(order.TrackingUrl)) column.Item().Text($"Seguimiento: {order.TrackingUrl}");
                column.Item().PaddingTop(14).Text("Gracias por confiar en nosotros. Tu esencia. Tu legado.").Italic();
            });
            page.Footer().AlignCenter().Text(t => { t.Span("Perfumes El Padrino | "); t.CurrentPageNumber(); t.Span(" / "); t.TotalPages(); });
        })).GeneratePdf();
    }
}
