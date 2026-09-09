using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Contracts;

public static class Mappings
{
    public static CategoryDto ToDto(this Category category) => new(category.Id, category.Name, category.Slug, category.Description, category.SortOrder, category.IsActive);

    public static ProductDto ToDto(this Product product) => new(
        product.Id,
        product.Name,
        product.Slug,
        product.Brand,
        product.Description,
        product.Gender,
        product.SizeMl,
        product.Price,
        product.CompareAtPrice,
        product.FreeShipping,
        product.ShippingFee,
        product.Stock,
        product.ImageUrl,
        product.Images.OrderBy(x => x.SortOrder).Select(x => new ProductImageDto(x.Id, x.Url, x.AltText, x.SortOrder)).ToList(),
        product.NotesCsv,
        product.CategoryId,
        product.Category?.Name,
        product.Featured,
        product.Bestseller,
        product.IsActive,
        product.SortOrder,
        product.UpdatedAt);

    public static SiteSettingsDto ToDto(this SiteSettings settings) => new(
        settings.StoreName,
        settings.Tagline,
        settings.Announcement,
        settings.HeroEyebrow,
        settings.HeroTitle,
        settings.HeroAccent,
        settings.HeroDescription,
        settings.LogoUrl,
        settings.HeroImageUrl,
        settings.WhatsAppNumber,
        settings.WhatsAppGreeting,
        settings.AboutTitle,
        settings.AboutText,
        settings.InstagramUrl,
        settings.Address,
        settings.DeliveryText,
        settings.Currency,
        settings.PrimaryColor,
        settings.AccentColor,
        settings.BackgroundColor);
}
