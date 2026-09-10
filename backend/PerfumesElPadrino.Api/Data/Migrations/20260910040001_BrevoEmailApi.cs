using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PerfumesElPadrino.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BrevoEmailApi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SmtpHost",
                table: "commerce_settings");

            migrationBuilder.DropColumn(
                name: "SmtpPort",
                table: "commerce_settings");

            migrationBuilder.DropColumn(
                name: "SmtpUsername",
                table: "commerce_settings");

            migrationBuilder.DropColumn(name: "SmtpPasswordEncrypted", table: "commerce_settings");
            migrationBuilder.AddColumn<string>(name: "BrevoApiKeyEncrypted", table: "commerce_settings", type: "text", nullable: true);
            // An SMTP password is not a Brevo API key. Require configuration before new orders.
            migrationBuilder.Sql("UPDATE commerce_settings SET \"CheckoutEnabled\" = FALSE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "BrevoApiKeyEncrypted", table: "commerce_settings");
            migrationBuilder.AddColumn<string>(name: "SmtpPasswordEncrypted", table: "commerce_settings", type: "text", nullable: true);
            migrationBuilder.Sql("UPDATE commerce_settings SET \"CheckoutEnabled\" = FALSE");

            migrationBuilder.AddColumn<string>(
                name: "SmtpHost",
                table: "commerce_settings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SmtpPort",
                table: "commerce_settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SmtpUsername",
                table: "commerce_settings",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
