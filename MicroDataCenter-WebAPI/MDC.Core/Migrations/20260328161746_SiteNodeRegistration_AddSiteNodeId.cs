using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class SiteNodeRegistration_AddSiteNodeId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SiteNodeRegistrations_SiteNodes_MemberAddress",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_SiteNodes_MemberAddress",
                table: "SiteNodes");

            migrationBuilder.AddColumn<Guid>(
                name: "SiteNodeId",
                table: "SiteNodeRegistrations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_SiteNodeId",
                table: "SiteNodeRegistrations",
                column: "SiteNodeId");

            migrationBuilder.AddForeignKey(
                name: "FK_SiteNodeRegistrations_SiteNodes_SiteNodeId",
                table: "SiteNodeRegistrations",
                column: "SiteNodeId",
                principalTable: "SiteNodes",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SiteNodeRegistrations_SiteNodes_SiteNodeId",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_SiteNodeId",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropColumn(
                name: "SiteNodeId",
                table: "SiteNodeRegistrations");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_SiteNodes_MemberAddress",
                table: "SiteNodes",
                column: "MemberAddress");

            migrationBuilder.AddForeignKey(
                name: "FK_SiteNodeRegistrations_SiteNodes_MemberAddress",
                table: "SiteNodeRegistrations",
                column: "MemberAddress",
                principalTable: "SiteNodes",
                principalColumn: "MemberAddress");
        }
    }
}
