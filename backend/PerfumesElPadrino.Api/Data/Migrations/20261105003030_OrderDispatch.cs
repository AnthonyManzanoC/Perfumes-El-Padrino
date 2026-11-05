using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PerfumesElPadrino.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class OrderDispatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "WhatsAppEnabled",
                table: "commerce_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppPrimary",
                table: "commerce_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppSecondary",
                table: "commerce_settings",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "order_dispatch_jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProofId = table.Column<Guid>(type: "uuid", nullable: true),
                    Recipient = table.Column<string>(type: "text", nullable: true),
                    BackupSnapshot = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    FinishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    Result = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_dispatch_jobs", x => x.Id);
                });

            migrationBuilder.Sql("ALTER TABLE order_dispatch_jobs ENABLE ROW LEVEL SECURITY;");

            migrationBuilder.CreateIndex(
                name: "IX_order_dispatch_jobs_FinishedAt_NextAttemptAt",
                table: "order_dispatch_jobs",
                columns: new[] { "FinishedAt", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_dispatch_jobs");

            migrationBuilder.DropColumn(
                name: "WhatsAppEnabled",
                table: "commerce_settings");

            migrationBuilder.DropColumn(
                name: "WhatsAppPrimary",
                table: "commerce_settings");

            migrationBuilder.DropColumn(
                name: "WhatsAppSecondary",
                table: "commerce_settings");
        }
    }
}
