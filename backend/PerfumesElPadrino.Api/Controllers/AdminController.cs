using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Security;
using PerfumesElPadrino.Api.Utilities;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminController(StoreDbContext db) : ControllerBase
{
    private static readonly string[] ValidStatuses = ["Pendiente", "Contactado", "Confirmado", "Entregado", "Cancelado"];

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var admin = await db.AdminUsers.FirstOrDefaultAsync(x => x.Email == email && x.IsActive, cancellationToken);
        if (admin is null || !PasswordSecurity.Verify(request.Password, admin.PasswordHash))
            return Unauthorized(new { message = "Correo o contraseña incorrectos." });

        var rawToken = PasswordSecurity.NewSessionToken();
        var expiresAt = DateTimeOffset.UtcNow.AddHours(24);
        db.AdminSessions.Add(new AdminSession
        {
            AdminUserId = admin.Id,
            TokenHash = PasswordSecurity.HashToken(rawToken),
            ExpiresAt = expiresAt
        });
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new LoginResponse(rawToken, expiresAt, admin.Email));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (HttpContext.Items["AdminSessionId"] is Guid sessionId)
        {
            var session = await db.AdminSessions.FindAsync([sessionId], cancellationToken);
            if (session is not null) db.AdminSessions.Remove(session);
            await db.SaveChangesAsync(cancellationToken);
        }
        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var firstDay = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var products = await db.Products.AsNoTracking().Where(x => x.IsActive).ToListAsync(cancellationToken);
        var orders = await db.Orders.AsNoTracking().Where(x => x.CreatedAt >= firstDay).ToListAsync(cancellationToken);
        return Ok(new
        {
            activeProducts = products.Count,
            lowStockProducts = products.Count(x => x.Stock <= 3),
            pendingOrders = orders.Count(x => x.Status == "Pendiente" || x.Status == "Contactado"),
            monthOrders = orders.Count,
            monthPotentialRevenue = orders.Where(x => x.Status != "Cancelado").Sum(x => x.Total)
        });
    }

    [HttpGet("settings")]
    public async Task<ActionResult<SiteSettingsDto>> GetSettings(CancellationToken cancellationToken)
        => Ok((await db.SiteSettings.AsNoTracking().SingleAsync(x => x.Id == 1, cancellationToken)).ToDto());

    [HttpPut("settings")]
    public async Task<ActionResult<SiteSettingsDto>> UpdateSettings([FromBody] SiteSettingsUpdateRequest request, CancellationToken cancellationToken)
    {
        var settings = await db.SiteSettings.SingleAsync(x => x.Id == 1, cancellationToken);
        settings.StoreName = request.StoreName.Trim();
        settings.Tagline = request.Tagline.Trim();
        settings.Announcement = request.Announcement.Trim();
        settings.HeroEyebrow = request.HeroEyebrow.Trim();
        settings.HeroTitle = request.HeroTitle.Trim();
        settings.HeroAccent = request.HeroAccent.Trim();
        settings.HeroDescription = request.HeroDescription.Trim();
        settings.LogoUrl = request.LogoUrl?.Trim();
        settings.HeroImageUrl = request.HeroImageUrl.Trim();
        settings.WhatsAppNumber = request.WhatsAppNumber.Trim();
        settings.WhatsAppGreeting = request.WhatsAppGreeting.Trim();
        settings.AboutTitle = request.AboutTitle.Trim();
        settings.AboutText = request.AboutText.Trim();
        settings.InstagramUrl = request.InstagramUrl.Trim();
        settings.Address = request.Address.Trim();
        settings.DeliveryText = request.DeliveryText.Trim();
        settings.Currency = request.Currency.Trim().ToUpperInvariant();
        settings.PrimaryColor = request.PrimaryColor;
        settings.AccentColor = request.AccentColor;
        settings.BackgroundColor = request.BackgroundColor;
        settings.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(settings.ToDto());
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetCategories(CancellationToken cancellationToken)
        => Ok((await db.Categories.AsNoTracking().OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken)).Select(x => x.ToDto()));

    [HttpPost("categories")]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CategoryUpsertRequest request, CancellationToken cancellationToken)
    {
        var category = new Category
        {
            Name = request.Name.Trim(),
            Slug = await UniqueCategorySlugAsync(request.Name, null, cancellationToken),
            Description = request.Description?.Trim(),
            SortOrder = request.SortOrder,
            IsActive = request.IsActive
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetCategories), category.ToDto());
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(Guid id, [FromBody] CategoryUpsertRequest request, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FindAsync([id], cancellationToken);
        if (category is null) return NotFound();
        category.Name = request.Name.Trim();
        category.Slug = await UniqueCategorySlugAsync(request.Name, id, cancellationToken);
        category.Description = request.Description?.Trim();
        category.SortOrder = request.SortOrder;
        category.IsActive = request.IsActive;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(category.ToDto());
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FindAsync([id], cancellationToken);
        if (category is null) return NotFound();
        category.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetProducts(CancellationToken cancellationToken)
    {
        var products = await db.Products.AsNoTracking().Include(x => x.Category).Include(x => x.Images).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        return Ok(products.Select(x => x.ToDto()));
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductDto>> CreateProduct([FromBody] ProductUpsertRequest request, CancellationToken cancellationToken)
    {
        if (request.CompareAtPrice is not null && request.CompareAtPrice <= request.Price)
            return BadRequest(new { message = "El precio anterior debe ser mayor al precio de oferta." });
        if (!request.FreeShipping && request.ShippingFee is null or <= 0)
            return BadRequest(new { message = "Ingresa un costo de envío mayor a cero." });
        if (request.CategoryId is not null && !await db.Categories.AnyAsync(x => x.Id == request.CategoryId, cancellationToken))
            return BadRequest(new { message = "La categoría seleccionada no existe." });

        var product = new Product();
        await ApplyProductAsync(product, request, cancellationToken);
        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken);
        await db.Entry(product).Reference(x => x.Category).LoadAsync(cancellationToken);
        return CreatedAtAction(nameof(GetProducts), product.ToDto());
    }

    [HttpPut("products/{id:guid}")]
    public async Task<ActionResult<ProductDto>> UpdateProduct(Guid id, [FromBody] ProductUpsertRequest request, CancellationToken cancellationToken)
    {
        if (request.CompareAtPrice is not null && request.CompareAtPrice <= request.Price)
            return BadRequest(new { message = "El precio anterior debe ser mayor al precio de oferta." });
        if (!request.FreeShipping && request.ShippingFee is null or <= 0)
            return BadRequest(new { message = "Ingresa un costo de envío mayor a cero." });
        var product = await db.Products.Include(x => x.Category).Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (product is null) return NotFound();
        if (request.CategoryId is not null && !await db.Categories.AnyAsync(x => x.Id == request.CategoryId, cancellationToken))
            return BadRequest(new { message = "La categoría seleccionada no existe." });
        await ApplyProductAsync(product, request, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await db.Entry(product).Reference(x => x.Category).LoadAsync(cancellationToken);
        return Ok(product.ToDto());
    }

    [HttpDelete("products/{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id, CancellationToken cancellationToken)
    {
        var product = await db.Products.FindAsync([id], cancellationToken);
        if (product is null) return NotFound();
        product.IsActive = false;
        product.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(CancellationToken cancellationToken)
    {
        var orders = await db.Orders.AsNoTracking().Include(x => x.Items).OrderByDescending(x => x.CreatedAt).Take(300).ToListAsync(cancellationToken);
        return Ok(orders.Select(order => new
        {
            order.Id,
            order.OrderNumber,
            order.CustomerName,
            order.CustomerPhone,
            order.City,
            order.Notes,
            order.Subtotal,
            order.ShippingTotal,
            order.Total,
            order.Status,
            order.InventoryCommitted,
            order.CreatedAt,
            items = order.Items.Select(item => new { item.Id, item.ProductId, item.ProductName, item.UnitPrice, item.Quantity })
        }));
    }

    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] OrderStatusRequest request, CancellationToken cancellationToken)
    {
        if (!ValidStatuses.Contains(request.Status, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "Estado de pedido no válido." });
        var order = await db.Orders.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (order is null) return NotFound();
        var nextStatus = ValidStatuses.Single(x => x.Equals(request.Status, StringComparison.OrdinalIgnoreCase));
        var shouldCommitInventory = nextStatus is "Confirmado" or "Entregado";

        if (shouldCommitInventory && !order.InventoryCommitted)
        {
            foreach (var item in order.Items)
            {
                if (item.Product is null || item.Product.Stock < item.Quantity)
                    return BadRequest(new { message = $"No hay stock suficiente de {item.ProductName} para confirmar el pedido." });
            }
            foreach (var item in order.Items.Where(x => x.Product is not null))
                item.Product!.Stock -= item.Quantity;
            order.InventoryCommitted = true;
        }
        else if (!shouldCommitInventory && order.InventoryCommitted)
        {
            foreach (var item in order.Items.Where(x => x.Product is not null))
                item.Product!.Stock += item.Quantity;
            order.InventoryCommitted = false;
        }

        order.Status = nextStatus;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { order.Id, order.Status });
    }

    [HttpDelete("orders/{id:guid}")]
    public async Task<IActionResult> DeleteOrder(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.Orders.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (order is null) return NotFound();
        if (order.InventoryCommitted)
        {
            foreach (var item in order.Items.Where(x => x.Product is not null))
                item.Product!.Stock += item.Quantity;
        }
        db.Orders.Remove(order);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task ApplyProductAsync(Product product, ProductUpsertRequest request, CancellationToken cancellationToken)
    {
        var gallery = request.Images
            .Select(x => new { Url = x.Url.Trim(), AltText = x.AltText?.Trim() })
            .Where(x => !string.IsNullOrWhiteSpace(x.Url))
            .DistinctBy(x => x.Url)
            .Take(8)
            .ToList();
        if (gallery.Count == 0)
            gallery.Add(new { Url = request.ImageUrl.Trim(), AltText = (string?)request.Name.Trim() });

        product.Name = request.Name.Trim();
        product.Slug = await UniqueProductSlugAsync(request.Name, product.Id == Guid.Empty ? null : product.Id, cancellationToken);
        product.Brand = request.Brand.Trim();
        product.Description = request.Description?.Trim();
        product.Gender = request.Gender.Trim();
        product.SizeMl = request.SizeMl;
        product.Price = request.Price;
        product.CompareAtPrice = request.CompareAtPrice;
        product.FreeShipping = request.FreeShipping;
        product.ShippingFee = request.FreeShipping ? null : request.ShippingFee;
        product.Stock = request.Stock;
        product.ImageUrl = gallery[0].Url;
        product.NotesCsv = request.NotesCsv?.Trim();
        product.CategoryId = request.CategoryId;
        product.Featured = request.Featured;
        product.Bestseller = request.Bestseller;
        product.IsActive = request.IsActive;
        product.SortOrder = request.SortOrder;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        var existingImages = product.Images.OrderBy(x => x.SortOrder).ToList();
        for (var index = 0; index < gallery.Count; index++)
        {
            var value = gallery[index];
            if (index < existingImages.Count)
            {
                existingImages[index].Url = value.Url;
                existingImages[index].AltText = string.IsNullOrWhiteSpace(value.AltText) ? request.Name.Trim() : value.AltText;
                existingImages[index].SortOrder = index;
            }
            else
            {
                var newImage = new ProductImage
                {
                    ProductId = product.Id,
                    Url = value.Url,
                    AltText = string.IsNullOrWhiteSpace(value.AltText) ? request.Name.Trim() : value.AltText,
                    SortOrder = index
                };
                product.Images.Add(newImage);
                db.Entry(newImage).State = EntityState.Added;
            }
        }
        if (existingImages.Count > gallery.Count)
            db.ProductImages.RemoveRange(existingImages.Skip(gallery.Count));
    }

    private async Task<string> UniqueProductSlugAsync(string name, Guid? currentId, CancellationToken cancellationToken)
    {
        var baseSlug = TextTools.Slugify(name);
        var slug = baseSlug;
        var suffix = 2;
        while (await db.Products.AnyAsync(x => x.Slug == slug && (!currentId.HasValue || x.Id != currentId.Value), cancellationToken))
            slug = $"{baseSlug}-{suffix++}";
        return slug;
    }

    private async Task<string> UniqueCategorySlugAsync(string name, Guid? currentId, CancellationToken cancellationToken)
    {
        var baseSlug = TextTools.Slugify(name);
        var slug = baseSlug;
        var suffix = 2;
        while (await db.Categories.AnyAsync(x => x.Slug == slug && (!currentId.HasValue || x.Id != currentId.Value), cancellationToken))
            slug = $"{baseSlug}-{suffix++}";
        return slug;
    }
}
