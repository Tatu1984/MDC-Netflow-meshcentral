using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class ActivityLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Workspaces",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "SiteNodes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "MachineId",
                table: "SiteNodeRegistrations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "SerialNumber",
                table: "SiteNodeRegistrations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "OrganizationUserRoles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ActivityLog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntityName = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "text", nullable: false),
                    ChangesJson = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityLog_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Workspaces_IsDeleted",
                table: "Workspaces",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Active",
                table: "Users",
                column: "Active");

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodes_MemberAddress",
                table: "SiteNodes",
                column: "MemberAddress",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SiteNodeRegistrations_MemberAddress",
                table: "SiteNodeRegistrations",
                column: "MemberAddress");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationUserRoles_IsDeleted",
                table: "OrganizationUserRoles",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Active",
                table: "Organizations",
                column: "Active");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityLog_UserId",
                table: "ActivityLog",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityLog");

            migrationBuilder.DropIndex(
                name: "IX_Workspaces_IsDeleted",
                table: "Workspaces");

            migrationBuilder.DropIndex(
                name: "IX_Users_Active",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SiteNodes_MemberAddress",
                table: "SiteNodes");

            migrationBuilder.DropIndex(
                name: "IX_SiteNodeRegistrations_MemberAddress",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropIndex(
                name: "IX_OrganizationUserRoles_IsDeleted",
                table: "OrganizationUserRoles");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_Active",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Workspaces");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "SiteNodes");

            migrationBuilder.DropColumn(
                name: "MachineId",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropColumn(
                name: "SerialNumber",
                table: "SiteNodeRegistrations");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "OrganizationUserRoles");
        }
    }
}
