using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class SiteNodeRegistration_AddSiteNodeSerialNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SerialNumber",
                table: "SiteNodes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SerialNumber",
                table: "SiteNodes");
        }
    }
}
