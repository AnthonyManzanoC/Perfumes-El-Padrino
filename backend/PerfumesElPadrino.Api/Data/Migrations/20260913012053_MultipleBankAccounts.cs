using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PerfumesElPadrino.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MultipleBankAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankAccountsJson",
                table: "commerce_settings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountsJson",
                table: "commerce_settings");
        }
    }
}
