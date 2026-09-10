namespace PerfumesElPadrino.Api.Models;

public sealed class SiteSettings
{
    public int Id { get; set; } = 1;
    public string StoreName { get; set; } = "Perfumes El Padrino";
    public string Tagline { get; set; } = "Tu esencia. Tu legado.";
    public string Announcement { get; set; } = "Perfumería 100% original · Asesoría personalizada por WhatsApp";
    public string HeroEyebrow { get; set; } = "Fragancias que dejan huella";
    public string HeroTitle { get; set; } = "Tu esencia.";
    public string HeroAccent { get; set; } = "Tu legado.";
    public string HeroDescription { get; set; } = "Perfumes originales seleccionados para convertir cada llegada en una declaración. Descubre el aroma que hablará por ti.";
    public string? LogoUrl { get; set; }
    public string HeroImageUrl { get; set; } = "/catalog/rabanne-invictus/3.webp";
    public string WhatsAppNumber { get; set; } = "593968591116";
    public string WhatsAppGreeting { get; set; } = "Hola, vengo de la tienda online de Perfumes El Padrino y quiero confirmar este pedido:";
    public string AboutTitle { get; set; } = "Una fragancia no se usa. Se recuerda.";
    public string AboutText { get; set; } = "Seleccionamos perfumes originales para acompañar momentos, historias y nuevas versiones de ti. Te asesoramos de forma cercana hasta encontrar el indicado.";
    public string InstagramUrl { get; set; } = "https://instagram.com";
    public string Address { get; set; } = "Ecuador · Envíos nacionales";
    public string DeliveryText { get; set; } = "Envíos a todo Ecuador";
    public string Currency { get; set; } = "USD";
    public string PrimaryColor { get; set; } = "#11100d";
    public string AccentColor { get; set; } = "#d8b96e";
    public string BackgroundColor { get; set; } = "#f4f0e7";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Product> Products { get; set; } = [];
}

public sealed class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Gender { get; set; } = "Unisex";
    public int? SizeMl { get; set; }
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public bool FreeShipping { get; set; } = true;
    public decimal? ShippingFee { get; set; }
    public int Stock { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? NotesCsv { get; set; }
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public ICollection<ProductImage> Images { get; set; } = [];
    public bool Featured { get; set; }
    public bool Bestseller { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class ProductImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; }
}

public sealed class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
    public string AccessTokenHash { get; set; } = string.Empty;
    public Guid? CheckoutKey { get; set; }
    public string Currency { get; set; } = "USD";
    public string BankSnapshot { get; set; } = string.Empty;
    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? City { get; set; }
    public string? Notes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal ShippingTotal { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "Pendiente";
    public bool InventoryCommitted { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<OrderItem> Items { get; set; } = [];
}

// Private data: never serialize these entities through storefront endpoints.
public sealed class CommerceSettings
{
    public int Id { get; set; } = 1;
    public bool CheckoutEnabled { get; set; }
    public string BankName { get; set; } = "";
    public string AccountType { get; set; } = "";
    public string AccountNumber { get; set; } = "";
    public string AccountHolder { get; set; } = "";
    public string Identification { get; set; } = "";
    public string PaymentInstructions { get; set; } = "Incluye tu número de pedido en la referencia de la transferencia.";
    public string? BrevoApiKeyEncrypted { get; set; }
    public string SenderEmail { get; set; } = "elpadrinoperfumes@gmail.com";
    public string SenderName { get; set; } = "Perfumes El Padrino";
    public string AdminEmail { get; set; } = "elpadrinoperfumes@gmail.com";
    public string StoreUrl { get; set; } = "https://perfumes-el-padrino.vercel.app";
    public string EmailFooter { get; set; } = "Gracias por elegir Perfumes El Padrino. Tu esencia. Tu legado.";
}

public sealed class PaymentProof
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public string ContentType { get; set; } = "image/jpeg";
    public byte[] Content { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class OrderEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public string Status { get; set; } = "";
    public string Message { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class EmailDelivery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? OrderId { get; set; }
    public Guid? EventId { get; set; }
    public string Recipient { get; set; } = "";
    public string Subject { get; set; } = "";
    public string HtmlBody { get; set; } = "";
    public string TextBody { get; set; } = "";
    public byte[]? Pdf { get; set; }
    public string? AttachmentName { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset NextAttemptAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }
}

public sealed class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}

public sealed class AdminUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<AdminSession> Sessions { get; set; } = [];
}

public sealed class AdminSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AdminUserId { get; set; }
    public AdminUser AdminUser { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
}
