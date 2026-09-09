using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Data;

public sealed class StoreDbContext(DbContextOptions<StoreDbContext> options) : DbContext(options)
{
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<AdminSession> AdminSessions => Set<AdminSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SiteSettings>(entity =>
        {
            entity.ToTable("site_settings");
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.StoreName).HasMaxLength(120);
            entity.Property(x => x.Tagline).HasMaxLength(180);
            entity.Property(x => x.Announcement).HasMaxLength(300);
            entity.Property(x => x.HeroEyebrow).HasMaxLength(120);
            entity.Property(x => x.HeroTitle).HasMaxLength(160);
            entity.Property(x => x.HeroAccent).HasMaxLength(160);
            entity.Property(x => x.WhatsAppNumber).HasMaxLength(30);
            entity.Property(x => x.Currency).HasMaxLength(8);
            entity.Property(x => x.PrimaryColor).HasMaxLength(16);
            entity.Property(x => x.AccentColor).HasMaxLength(16);
            entity.Property(x => x.BackgroundColor).HasMaxLength(16);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.Slug).HasMaxLength(120);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(180);
            entity.Property(x => x.Slug).HasMaxLength(200);
            entity.Property(x => x.Brand).HasMaxLength(100);
            entity.Property(x => x.Gender).HasMaxLength(30);
            entity.Property(x => x.Price).HasPrecision(12, 2);
            entity.Property(x => x.CompareAtPrice).HasPrecision(12, 2);
            entity.Property(x => x.FreeShipping).HasDefaultValue(true);
            entity.Property(x => x.ShippingFee).HasPrecision(12, 2);
            entity.HasOne(x => x.Category).WithMany(x => x.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.ToTable("product_images");
            entity.Property(x => x.Url).HasMaxLength(3_000_000);
            entity.Property(x => x.AltText).HasMaxLength(220);
            entity.HasIndex(x => new { x.ProductId, x.SortOrder });
            entity.HasOne(x => x.Product).WithMany(x => x.Images).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasIndex(x => x.OrderNumber).IsUnique();
            entity.Property(x => x.OrderNumber).HasMaxLength(40);
            entity.Property(x => x.CustomerName).HasMaxLength(140);
            entity.Property(x => x.CustomerPhone).HasMaxLength(40);
            entity.Property(x => x.Status).HasMaxLength(30);
            entity.Property(x => x.Subtotal).HasPrecision(12, 2);
            entity.Property(x => x.ShippingTotal).HasPrecision(12, 2);
            entity.Property(x => x.Total).HasPrecision(12, 2);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.Property(x => x.ProductName).HasMaxLength(180);
            entity.Property(x => x.UnitPrice).HasPrecision(12, 2);
            entity.HasOne(x => x.Order).WithMany(x => x.Items).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.ToTable("admin_users");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(180);
        });

        modelBuilder.Entity<AdminSession>(entity =>
        {
            entity.ToTable("admin_sessions");
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.Property(x => x.TokenHash).HasMaxLength(128);
            entity.HasOne(x => x.AdminUser).WithMany(x => x.Sessions).HasForeignKey(x => x.AdminUserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
