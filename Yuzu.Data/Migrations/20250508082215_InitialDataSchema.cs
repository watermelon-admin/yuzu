using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Yuzu.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialDataSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Data_BackgroundImages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    file_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    thumbnail_url = table.Column<string>(type: "text", nullable: false),
                    full_image_url = table.Column<string>(type: "text", nullable: false),
                    thumbnail_path = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    full_image_path = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_system = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Data_BackgroundImages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Data_BreakTypes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    default_duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    countdown_message = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    countdown_end_message = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    end_time_title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    break_time_step_minutes = table.Column<int>(type: "integer", nullable: false),
                    background_image_choices = table.Column<string>(type: "text", nullable: true),
                    image_title = table.Column<string>(type: "text", nullable: true),
                    usage_count = table.Column<long>(type: "bigint", nullable: false),
                    icon_name = table.Column<string>(type: "text", nullable: true),
                    components = table.Column<string>(type: "text", nullable: true),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Data_BreakTypes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Data_UserData",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    data_key = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Data_UserData", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Data_Breaks",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    break_type_id = table.Column<int>(type: "integer", nullable: false),
                    start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Data_Breaks", x => x.id);
                    table.ForeignKey(
                        name: "FK_Data_Breaks_Data_BreakTypes_break_type_id",
                        column: x => x.break_type_id,
                        principalTable: "Data_BreakTypes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Data_BackgroundImages_file_name",
                table: "Data_BackgroundImages",
                column: "file_name");

            migrationBuilder.CreateIndex(
                name: "IX_Data_BackgroundImages_user_id",
                table: "Data_BackgroundImages",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Data_Breaks_break_type_id",
                table: "Data_Breaks",
                column: "break_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_Data_Breaks_user_id",
                table: "Data_Breaks",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Data_BreakTypes_user_id",
                table: "Data_BreakTypes",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Data_UserData_user_id",
                table: "Data_UserData",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Data_UserData_user_id_data_key",
                table: "Data_UserData",
                columns: new[] { "user_id", "data_key" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Data_BackgroundImages");

            migrationBuilder.DropTable(
                name: "Data_Breaks");

            migrationBuilder.DropTable(
                name: "Data_UserData");

            migrationBuilder.DropTable(
                name: "Data_BreakTypes");
        }
    }
}
