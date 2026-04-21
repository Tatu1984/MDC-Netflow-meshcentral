using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MDC.Core.Migrations
{
    /// <inheritdoc />
    public partial class DbSiteNode_Remove_FK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_SiteNodes",
                table: "SiteNodes");

            //migrationBuilder.AddPrimaryKey(
            //    name: "PK_SiteNodes",
            //    table: "SiteNodes",
            //    column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            //migrationBuilder.DropPrimaryKey(
            //    name: "PK_SiteNodes",
            //    table: "SiteNodes");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SiteNodes",
                table: "SiteNodes",
                column: "MemberAddress");
        }
    }
}
