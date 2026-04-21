using MDC.Core.Services.Providers.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MDC.Core.Services.Providers.MDCDatabase;

// To Add migration, open the Developer PowerShell and run the following (change "InitialCreate" to something else):
//      dotnet ef migrations add InitialCreate --startup-project "MDC.Api" --project "MDC.Core" --output-dir "Migrations"
// You may need to install dotnet EF: dotnet tool install --global dotnet-ef
// To Remove a migration, run
//      dotnet ef migrations remove --startup-project "MDC.Api" --project "MDC.Core"

internal class MDCDbContext(IConfiguration configuration, ITenantContext tenantContext) : DbContext
{
    // public DbSet<DbDatacenter> Datacenters { get; set; }
    public DbSet<DbSite> Sites { get; set; }

    public DbSet<DbSiteNode> SiteNodes { get; set; }

    public DbSet<DbSiteNodeRegistration> SiteNodeRegistrations { get; set; }

    public DbSet<DbWorkspace> Workspaces { get; set; }

    public DbSet<DbVirtualNetwork> VirtualNetworks { get; set; }

    public DbSet<DbOrganization> Organizations { get; set; }

    public DbSet<DbUser> Users { get; set; }

    public DbSet<DbOrganizationUserRole> OrganizationUserRoles{ get; set; }

    public DbSet<DbActivityLog> ActivityLog { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (optionsBuilder.IsConfigured)
        {
            return;
        }
        // Use the connection string from the configuration
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            // For testing purposes, use an in-memory database if no connection string is provided
            // optionsBuilder.UseInMemoryDatabase("MDC");
            throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
        }
        //optionsBuilder.UseSqlServer(connectionString, options =>
        //{
        //    options.MigrationsAssembly("MDC.Core");
        //    options.MigrationsHistoryTable("__EFMigrationsHistory");
        //    //options.EnableRetryOnFailure(
        //    //    maxRetryCount: 5,
        //    //    maxRetryDelay: TimeSpan.FromSeconds(10),
        //    //    errorNumbersToAdd: null);
        //});
        optionsBuilder.UseNpgsql(connectionString, options =>
        {
            options.MigrationsAssembly("MDC.Core");
            options.MigrationsHistoryTable("__EFMigrationsHistory");
        });
        optionsBuilder.AddInterceptors(new AuditInterceptor(tenantContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<DbSite>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.ApiTokenId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ApiSecret).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasMany(e => e.SiteNodes)
                .WithOne(sn => sn.Site)
                .HasForeignKey(sn => sn.SiteId);
            //.IsRequired();

            entity.HasMany(e => e.Workspaces)
                .WithOne(w => w.Site)
                .HasForeignKey(w => w.SiteId);
                //.IsRequired();

            entity.HasMany(e => e.Organizations)
                .WithMany(o => o.Sites);

            entity.HasQueryFilter(site =>
                tenantContext.IsPrivilegedUser || tenantContext.IsDeviceRegistration
                ||
                (tenantContext.ObjectId != null
                && tenantContext.IsAuthenticated
                && site.Organizations.Any(org => org.OrganizationUserRoles.Any(role => role.UserId == tenantContext.ObjectId && role.User != null && role.User.Active == true))));
        });

        modelBuilder.Entity<DbSiteNode>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ApiPort).IsRequired().HasDefaultValue(8006);
            entity.Property(e => e.ApiValidateServerCertificate).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.SiteId);
            //.IsRequired();

            entity.HasOne(e => e.Site)
                .WithMany(e => e.SiteNodes)
                .HasForeignKey(e => e.SiteId);
            //.IsRequired();

            //entity.HasMany(e => e.SiteNodeRegistrations)
            //    .WithOne(e => e.SiteNode)
            //    .HasForeignKey(e => e.SiteNode);

            entity.HasQueryFilter(siteNode =>
                tenantContext.IsPrivilegedUser || tenantContext.IsDeviceRegistration
                ||
                (tenantContext.ObjectId != null
                && tenantContext.IsAuthenticated
                && siteNode.Site != null
                && siteNode.Site.Organizations.Any(org =>
                    org.OrganizationUserRoles.Any(role => role.UserId == tenantContext.ObjectId && role.User != null && role.User.Active == true))));
        });

        modelBuilder.Entity<DbWorkspace>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Address).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.SiteId);
            //.IsRequired();
            entity.Property(e => e.OrganizationId);
            //.IsRequired();

            entity.HasOne(e => e.Site)
                .WithMany(d => d.Workspaces)
                .HasForeignKey(e => e.SiteId);
                //.IsRequired();

            entity.HasMany(e => e.VirtualNetworks)
                .WithOne(vn => vn.Workspace)
                .HasForeignKey(vn => vn.WorkspaceId);

            entity.HasOne(e => e.Organization)
                .WithMany(d => d.Workspaces)
                .HasForeignKey(w => w.OrganizationId);
                //.IsRequired();

            entity.HasQueryFilter(workspace =>
                !workspace.IsDeleted
                && 
                (
                    tenantContext.IsPrivilegedUser
                    ||
                    (tenantContext.ObjectId != null
                    && tenantContext.IsAuthenticated
                    && workspace.Organization != null
                    && workspace.Organization.OrganizationUserRoles != null
                    && workspace.Organization.OrganizationUserRoles.Any(role => role.UserId == tenantContext.ObjectId && role.User != null && role.User.Active == true)))
                );
        });

        modelBuilder.Entity<DbVirtualNetwork>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Index).IsRequired();
            entity.Property(e => e.Tag).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.WorkspaceId);
            //.IsRequired();

            entity.HasOne(e => e.Workspace)
                .WithMany(w => w.VirtualNetworks)
                .HasForeignKey(e => e.WorkspaceId);
                //.IsRequired();

            entity.HasQueryFilter(virtualNetwork =>
                tenantContext.IsPrivilegedUser
                ||
                (tenantContext.ObjectId != null
                && tenantContext.IsAuthenticated
                && virtualNetwork.Workspace != null
                && virtualNetwork.Workspace.Organization != null
                && virtualNetwork.Workspace.Organization.OrganizationUserRoles != null
                && virtualNetwork.Workspace.Organization.OrganizationUserRoles.Any(role =>role.UserId == tenantContext.ObjectId && role.User != null && role.User.Active == true)));
        });

        modelBuilder.Entity<DbOrganization>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasMany(e => e.Sites)
                .WithMany(s => s.Organizations);

            entity.HasMany(e => e.Workspaces)
                .WithOne(w => w.Organization)
                .HasForeignKey(w => w.OrganizationId);
            //.IsRequired();

            entity.HasMany(e => e.OrganizationUserRoles)
                .WithOne(o => o.Organization)
                .HasForeignKey(o => o.OrganizationId);
                //.IsRequired();

            entity.HasQueryFilter(organization =>
                organization.Active
                && (
                    tenantContext.IsPrivilegedUser
                    ||
                    (tenantContext.ObjectId != null
                    && tenantContext.IsAuthenticated
                    && organization.OrganizationUserRoles != null
                    && organization.OrganizationUserRoles.Any(role => role.UserId == tenantContext.ObjectId && role.User != null && role.User.Active == true)))
                );
        });

        modelBuilder.Entity<DbUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasMany(e => e.OrganizationUserRoles)
                .WithOne(o => o.User)
                .HasForeignKey(o => o.UserId);
            //.IsRequired();

            entity.HasMany(i => i.Activities)
                .WithOne(a => a.User)
                .HasForeignKey(a => a.UserId);

            entity.HasMany(e => e.Activities)
                .WithOne(a => a.User)
                .HasForeignKey(a => a.UserId);

            entity.HasQueryFilter(user =>
                tenantContext.IsPrivilegedUser
                ||
                (tenantContext.ObjectId != null
                && tenantContext.IsAuthenticated
                && (
                    user.Id == tenantContext.ObjectId
                    && user.Active == true
                    // Include other Users who are in Organizations which tenantUser is a member of
                    //|| OrganizationUserRoles
                    //    .IgnoreQueryFilters()
                    //    .Where(tenantOur => tenantOur.UserId == tenantContext.ObjectId)
                    //    .Select(i => i.UserId)
                    //    .Distinct()
                    //    .Contains(user.Id)
                )));
        });

        modelBuilder.Entity<DbOrganizationUserRole>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Role).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.UserId);
            //.IsRequired();
            entity.Property(e => e.OrganizationId);
            //.IsRequired();

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.OrganizationUserRoles)
                .HasForeignKey(o => o.OrganizationId);
            //.IsRequired();

            entity.HasOne(e => e.User)
                .WithMany(o => o.OrganizationUserRoles)
                .HasForeignKey(o => o.UserId);
                //.IsRequired();

            entity.HasQueryFilter(our =>
                !our.IsDeleted 
                && (
                    tenantContext.IsPrivilegedUser
                    ||
                    (tenantContext.ObjectId != null
                    && tenantContext.IsAuthenticated
                    && (
                        our.UserId == tenantContext.ObjectId && our.User!= null && our.User.Active == true
                        // Include OrganizationUserRoles for other Users who are in Organizations which tenantUser is a member of
                        //|| OrganizationUserRoles
                        //    .IgnoreQueryFilters()
                        //    .Where(tenantOur => tenantOur.UserId == tenantContext.ObjectId)
                        //    .Select(i => i.OrganizationId)
                        //    .Distinct()
                        //    .Contains(our.OrganizationId)
                    )))
                );
        });

        modelBuilder.Entity<DbActivityLog>(entity =>
        {
            entity.HasQueryFilter(a =>
                tenantContext.IsPrivilegedUser
                ||
                (tenantContext.ObjectId != null
                && tenantContext.IsAuthenticated
                && (
                    a.UserId == tenantContext.ObjectId  
                    ||
                    a.User != null
                )
                ));
        });

        modelBuilder.Entity<DbSiteNodeRegistration>(entity =>
        {
            entity.HasOne(r => r.SiteNode)
                .WithMany(sn => sn.SiteNodeRegistrations)
                .HasForeignKey(r => r.SiteNodeId);
        });
    }
}
