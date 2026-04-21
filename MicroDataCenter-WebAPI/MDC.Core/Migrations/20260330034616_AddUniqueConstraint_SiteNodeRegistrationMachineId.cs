using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueConstraint_SiteNodeRegistrationMachineId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_MemberAddress",
                table: "SiteNodeRegistrations");

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations",
                column: "MachineId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_MemberAddress",
                table: "SiteNodeRegistrations",
                column: "MemberAddress",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_MemberAddress",
                table: "SiteNodeRegistrations");

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations",
                column: "MachineId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_MemberAddress",
                table: "SiteNodeRegistrations",
                column: "MemberAddress");
        }
    }
}
