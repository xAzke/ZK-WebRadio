using Microsoft.EntityFrameworkCore;

namespace Webradio.Data;

public class WebradioDbContext : DbContext
{
    public WebradioDbContext(DbContextOptions<WebradioDbContext> options) : base(options)
    {
    }

    public DbSet<ApiKeyEntity> ApiKeys { get; set; }
    public DbSet<TrackMetadata> TrackMetadata { get; set; }
    public DbSet<DeezerAccountEntity> DeezerAccounts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // DeezerAccount indexes
        modelBuilder.Entity<DeezerAccountEntity>()
            .HasIndex(e => e.UserId)
            .IsUnique();

        // ApiKey indexes
        modelBuilder.Entity<ApiKeyEntity>()
            .HasIndex(e => e.Key)
            .IsUnique();

        modelBuilder.Entity<ApiKeyEntity>()
            .HasIndex(e => e.ServerAddress)
            .IsUnique();

        modelBuilder.Entity<ApiKeyEntity>()
            .HasIndex(e => e.Owner);

        // TrackMetadata indexes
        modelBuilder.Entity<TrackMetadata>()
            .HasIndex(e => e.PlayCount);
    }
}
