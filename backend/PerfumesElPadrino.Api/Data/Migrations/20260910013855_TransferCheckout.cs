using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PerfumesElPadrino.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TransferCheckout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessTokenHash",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BankSnapshot",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Carrier",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CheckoutKey",
                table: "orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<string>(
                name: "CustomerEmail",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PaidAt",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TrackingNumber",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackingUrl",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "orders",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.CreateTable(
                name: "commerce_settings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    CheckoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    BankName = table.Column<string>(type: "text", nullable: false),
                    AccountType = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "text", nullable: false),
                    AccountHolder = table.Column<string>(type: "text", nullable: false),
                    Identification = table.Column<string>(type: "text", nullable: false),
                    PaymentInstructions = table.Column<string>(type: "text", nullable: false),
                    SmtpHost = table.Column<string>(type: "text", nullable: false),
                    SmtpPort = table.Column<int>(type: "integer", nullable: false),
                    SmtpUsername = table.Column<string>(type: "text", nullable: false),
                    SmtpPasswordEncrypted = table.Column<string>(type: "text", nullable: true),
                    SenderEmail = table.Column<string>(type: "text", nullable: false),
                    SenderName = table.Column<string>(type: "text", nullable: false),
                    AdminEmail = table.Column<string>(type: "text", nullable: false),
                    StoreUrl = table.Column<string>(type: "text", nullable: false),
                    EmailFooter = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commerce_settings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "email_deliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventId = table.Column<Guid>(type: "uuid", nullable: true),
                    Recipient = table.Column<string>(type: "text", nullable: false),
                    Subject = table.Column<string>(type: "text", nullable: false),
                    HtmlBody = table.Column<string>(type: "text", nullable: false),
                    TextBody = table.Column<string>(type: "text", nullable: false),
                    Pdf = table.Column<byte[]>(type: "bytea", nullable: true),
                    AttachmentName = table.Column<string>(type: "text", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockedUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_deliveries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "order_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_events", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "payment_proofs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<byte[]>(type: "bytea", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_proofs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_orders_CheckoutKey",
                table: "orders",
                column: "CheckoutKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_email_deliveries_EventId_Recipient",
                table: "email_deliveries",
                columns: new[] { "EventId", "Recipient" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_email_deliveries_SentAt_NextAttemptAt",
                table: "email_deliveries",
                columns: new[] { "SentAt", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_order_events_OrderId_CreatedAt",
                table: "order_events",
                columns: new[] { "OrderId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_proofs_OrderId",
                table: "payment_proofs",
                column: "OrderId");
            // Supabase Data API must not expose customer records, proofs, outbox or credentials.
            // The backend connects as the database owner; no browser role receives a policy.
            foreach (var table in new[] { "commerce_settings", "payment_proofs", "order_events", "email_deliveries", "orders", "order_items", "admin_users", "admin_sessions" })
                migrationBuilder.Sql($"ALTER TABLE \"{table}\" ENABLE ROW LEVEL SECURITY;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "commerce_settings");

            migrationBuilder.DropTable(
                name: "email_deliveries");

            migrationBuilder.DropTable(
                name: "order_events");

            migrationBuilder.DropTable(
                name: "payment_proofs");

            migrationBuilder.DropIndex(
                name: "IX_orders_CheckoutKey",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "AccessTokenHash",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "BankSnapshot",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Carrier",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "CheckoutKey",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "CustomerEmail",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "TrackingNumber",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "TrackingUrl",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "orders");
        }
    }
}
