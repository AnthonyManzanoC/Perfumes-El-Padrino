using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController]
[Route("api/storefront")]
public sealed class StorefrontController(StoreDbContext db, OrderWorkflow workflow) : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any)]
    public async Task<ActionResult<StorefrontDto>> Get(CancellationToken cancellationToken)
    {
        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(x => x.Id == 1, cancellationToken);
        var categories = await db.Categories.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        var products = await db.Products.AsNoTracking().Include(x => x.Category).Include(x => x.Images).Where(x => x.IsActive).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        var reserved = await workflow.ReservedAsync(cancellationToken);
        foreach (var product in products) product.Stock = Math.Max(0, product.Stock - reserved.GetValueOrDefault(product.Id));
        return Ok(new StorefrontDto(settings.ToDto(), categories.Select(x => x.ToDto()).ToList(), products.Select(x => x.ToDto()).ToList()));
    }

    [HttpGet("products/{slug}")]
    [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any)]
    public async Task<ActionResult<ProductDto>> GetProduct(string slug, CancellationToken cancellationToken)
    {
        var product = await db.Products.AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Images)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive, cancellationToken);
        if (product is null) return NotFound(new { message = "Este perfume ya no está disponible." });
        var reserved = await workflow.ReservedAsync(cancellationToken);
        product.Stock = Math.Max(0, product.Stock - reserved.GetValueOrDefault(product.Id));
        return Ok(product.ToDto());
    }

}
