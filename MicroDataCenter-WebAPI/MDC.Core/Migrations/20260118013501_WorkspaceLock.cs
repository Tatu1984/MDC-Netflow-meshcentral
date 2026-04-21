using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class WorkspaceLock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Locked",
                table: "Workspaces",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Locked",
                table: "Workspaces");
        }
    }
}
