using System.ComponentModel.DataAnnotations;

namespace PerfumesElPadrino.Api.Contracts;

public sealed record CategoryDto(Guid Id, string Name, string Slug, string? Description, int SortOrder, bool IsActive);

public sealed record ProductImageDto(Guid Id, string Url, string? AltText, int SortOrder);

public sealed record ProductDto(
    Guid Id,
    string Name,
    string Slug,
    string Brand,
    string? Description,
    string Gender,
    int? SizeMl,
    decimal Price,
    decimal? CompareAtPrice,
    bool FreeShipping,
    decimal? ShippingFee,
    int Stock,
    string ImageUrl,
    IReadOnlyList<ProductImageDto> Images,
    string? NotesCsv,
    Guid? CategoryId,
    string? CategoryName,
    bool Featured,
    bool Bestseller,
    bool IsActive,
    int SortOrder,
    DateTimeOffset UpdatedAt);

public sealed record SiteSettingsDto(
    string StoreName,
    string Tagline,
    string Announcement,
    string HeroEyebrow,
    string HeroTitle,
    string HeroAccent,
    string HeroDescription,
    string? LogoUrl,
    string HeroImageUrl,
    string WhatsAppNumber,
    string WhatsAppGreeting,
    string AboutTitle,
    string AboutText,
    string InstagramUrl,
    string Address,
    string DeliveryText,
    string Currency,
    string PrimaryColor,
    string AccentColor,
    string BackgroundColor);

public sealed record StorefrontDto(SiteSettingsDto Settings, IReadOnlyList<CategoryDto> Categories, IReadOnlyList<ProductDto> Products);

public sealed class CreateOrderRequest
{
    [Required, StringLength(140, MinimumLength = 2)] public string CustomerName { get; set; } = string.Empty;
    [Required, StringLength(40, MinimumLength = 7)] public string CustomerPhone { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(180)] public string CustomerEmail { get; set; } = string.Empty;
    [Required, StringLength(500, MinimumLength = 8)] public string ShippingAddress { get; set; } = string.Empty;
    [Required, StringLength(120, MinimumLength = 2)] public string? City { get; set; }
    public Guid CheckoutKey { get; set; }
    [Required, RegularExpression("^[a-f0-9]{64}$")] public string AccessToken { get; set; } = string.Empty;
    [StringLength(1000)] public string? Notes { get; set; }
    [Required, MinLength(1), MaxLength(50)] public List<CreateOrderItemRequest> Items { get; set; } = [];
}

public sealed class CreateOrderItemRequest
{
    public Guid ProductId { get; set; }
    [Range(1, 20)] public int Quantity { get; set; }
}

public sealed record CreateOrderResponse(string OrderNumber, decimal Subtotal, decimal ShippingTotal, decimal Total);

public sealed class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
}

public sealed record LoginResponse(string Token, DateTimeOffset ExpiresAt, string Email);

public sealed class CategoryUpsertRequest
{
    [Required, StringLength(100, MinimumLength = 2)] public string Name { get; set; } = string.Empty;
    [StringLength(300)] public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class ProductUpsertRequest
{
    [Required, StringLength(180, MinimumLength = 2)] public string Name { get; set; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 2)] public string Brand { get; set; } = string.Empty;
    [StringLength(2000)] public string? Description { get; set; }
    [Required, StringLength(30)] public string Gender { get; set; } = "Unisex";
    [Range(1, 2000)] public int? SizeMl { get; set; }
    [Range(0.01, 1_000_000)] public decimal Price { get; set; }
    [Range(0.01, 1_000_000)] public decimal? CompareAtPrice { get; set; }
    public bool FreeShipping { get; set; } = true;
    [Range(0.01, 1_000_000)] public decimal? ShippingFee { get; set; }
    [Range(0, 1_000_000)] public int Stock { get; set; }
    [Range(0, 1_000_000)] public int? OriginalStock { get; set; }
    [Required, StringLength(3_000_000)] public string ImageUrl { get; set; } = string.Empty;
    [MaxLength(8)] public List<ProductImageInput> Images { get; set; } = [];
    [StringLength(500)] public string? NotesCsv { get; set; }
    public Guid? CategoryId { get; set; }
    public bool Featured { get; set; }
    public bool Bestseller { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public sealed class ProductImageInput
{
    [Required, StringLength(3_000_000)] public string Url { get; set; } = string.Empty;
    [StringLength(220)] public string? AltText { get; set; }
}

public sealed class SiteSettingsUpdateRequest
{
    [Required, StringLength(120)] public string StoreName { get; set; } = string.Empty;
    [Required, StringLength(180)] public string Tagline { get; set; } = string.Empty;
    [Required, StringLength(300)] public string Announcement { get; set; } = string.Empty;
    [Required, StringLength(120)] public string HeroEyebrow { get; set; } = string.Empty;
    [Required, StringLength(160)] public string HeroTitle { get; set; } = string.Empty;
    [Required, StringLength(160)] public string HeroAccent { get; set; } = string.Empty;
    [Required, StringLength(2000)] public string HeroDescription { get; set; } = string.Empty;
    [StringLength(3_000_000)] public string? LogoUrl { get; set; }
    [Required, StringLength(3_000_000)] public string HeroImageUrl { get; set; } = string.Empty;
    [Required, StringLength(30)] public string WhatsAppNumber { get; set; } = string.Empty;
    [Required, StringLength(500)] public string WhatsAppGreeting { get; set; } = string.Empty;
    [Required, StringLength(200)] public string AboutTitle { get; set; } = string.Empty;
    [Required, StringLength(3000)] public string AboutText { get; set; } = string.Empty;
    [StringLength(500)] public string InstagramUrl { get; set; } = string.Empty;
    [StringLength(300)] public string Address { get; set; } = string.Empty;
    [StringLength(300)] public string DeliveryText { get; set; } = string.Empty;
    [Required, StringLength(8)] public string Currency { get; set; } = "USD";
    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$")] public string PrimaryColor { get; set; } = "#11100d";
    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$")] public string AccentColor { get; set; } = "#d8b96e";
    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$")] public string BackgroundColor { get; set; } = "#f4f0e7";
}

public sealed class OrderStatusRequest
{
    [Required, StringLength(30)] public string Status { get; set; } = string.Empty;
    [StringLength(100)] public string? Carrier { get; set; }
    [StringLength(120)] public string? TrackingNumber { get; set; }
    [StringLength(500)] public string? TrackingUrl { get; set; }
    [StringLength(600)] public string? Message { get; set; }
    public bool BankVerified { get; set; }
}

public sealed class CommerceSettingsRequest
{
    public bool CheckoutEnabled { get; set; }
    [StringLength(100)] public string BankName { get; set; } = "";
    [StringLength(50)] public string AccountType { get; set; } = "";
    [StringLength(80)] public string AccountNumber { get; set; } = "";
    [StringLength(180)] public string AccountHolder { get; set; } = "";
    [StringLength(40)] public string Identification { get; set; } = "";
    [StringLength(1000)] public string PaymentInstructions { get; set; } = "";
    [Required, StringLength(180)] public string SmtpHost { get; set; } = "smtp.gmail.com";
    [Range(1, 65535)] public int SmtpPort { get; set; } = 587;
    [Required, StringLength(180)] public string SmtpUsername { get; set; } = "";
    [StringLength(500)] public string? SmtpPassword { get; set; }
    [Required, EmailAddress, StringLength(180)] public string SenderEmail { get; set; } = "";
    [Required, StringLength(120)] public string SenderName { get; set; } = "";
    [Required, EmailAddress, StringLength(180)] public string AdminEmail { get; set; } = "";
    [Required, Url, StringLength(500)] public string StoreUrl { get; set; } = "";
    [StringLength(1000)] public string EmailFooter { get; set; } = "";
}
