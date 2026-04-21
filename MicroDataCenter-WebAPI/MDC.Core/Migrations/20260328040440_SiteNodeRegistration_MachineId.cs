using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class SiteNodeRegistration_MachineId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "SiteNodeRegistrations",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SystemInfo",
                table: "SiteNodeRegistrations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_SiteNodes_MemberAddress",
                table: "SiteNodes",
                column: "MemberAddress");

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations",
                column: "MachineId");

            migrationBuilder.AddForeignKey(
                name: "FK_SiteNodeRegistrations_SiteNodes_MemberAddress",
                table: "SiteNodeRegistrations",
                column: "MemberAddress",
                principalTable: "SiteNodes",
                principalColumn: "MemberAddress");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SiteNodeRegistrations_SiteNodes_MemberAddress",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_SiteNodes_MemberAddress",
                table: "SiteNodes");

            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_MachineId",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropColumn(
                name: "SystemInfo",
                table: "SiteNodeRegistrations");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "SiteNodeRegistrations",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
