using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class SiteNodeRegistration_AddSiteNodeMachineId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MachineId",
                table: "SiteNodes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodes_MachineId",
                table: "SiteNodes",
                column: "MachineId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SiteNodes_MachineId",
                table: "SiteNodes");

            migrationBuilder.DropColumn(
                name: "MachineId",
                table: "SiteNodes");
        }
    }
}
