using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class SiteNodeRegistration_UUID : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MachineId",
                table: "SiteNodeRegistrations",
                newName: "UUID");

            migrationBuilder.RenameIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations",
                newName: "IX_SiteNodeRegistrations_UUID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UUID",
                table: "SiteNodeRegistrations",
                newName: "MachineId");

            migrationBuilder.RenameIndex(
                name: "IX_SiteNodeRegistrations_UUID",
                table: "SiteNodeRegistrations",
                newName: "IX_SiteNodeRegistrations_MachineId");
        }
    }
}
