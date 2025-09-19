# Azure Tables Migration Plan - Yuzu Application

## Executive Summary

This document outlines the complete migration strategy for moving Yuzu's data access layer from PostgreSQL/Entity Framework Core to Azure Tables Storage.

## Current State Analysis

### Database Statistics
- **4 Core Entities**: BreakType, Break, UserDataItem, BackgroundImage
- **1 Foreign Key Relationship**: Break → BreakType (with CASCADE delete)
- **6 Indexes**: Including 1 unique composite index
- **Auto-incrementing Integer PKs**: All entities use sequential IDs
- **Transaction Usage**: Bulk deletes and multi-table operations

### Critical Migration Challenges
1. **No Auto-increment**: Azure Tables requires redesigning all primary keys
2. **No Foreign Keys**: Application must manage referential integrity
3. **No Transactions**: Multi-table operations need compensation patterns
4. **Limited Querying**: No SQL, no ORDER BY, no complex WHERE clauses
5. **No Unique Constraints**: Except for PartitionKey + RowKey combination

## Proposed Azure Tables Schema Design

### 1. BreakType Entity
```
Table: BreakTypes
PartitionKey: {userId}
RowKey: {breakTypeId} (GUID)

Properties:
- Name (string)
- DefaultDurationMinutes (int)
- CountdownMessage (string)
- CountdownEndMessage (string)
- EndTimeTitle (string)
- BreakTimeStepMinutes (int)
- BackgroundImageChoices (string)
- ImageTitle (string)
- UsageCount (long)
- IconName (string)
- Components (string) - JSON data
- IsLocked (bool)
- SortOrder (int)
- CreatedAt (DateTime)
- UpdatedAt (DateTime)

Query Patterns Supported:
✅ Get all break types for user (PartitionKey query)
✅ Get specific break type (Point query)
✅ Delete user's break types (Partition scan)
```

### 2. Break Entity
```
Table: Breaks
PartitionKey: {userId}
RowKey: {breakId} (GUID)

Properties:
- BreakTypeId (string) - GUID reference
- BreakTypeName (string) - DENORMALIZED for display
- StartTime (DateTime)
- EndTime (DateTime)
- CreatedAt (DateTime)
- UpdatedAt (DateTime)

Query Patterns Supported:
✅ Get all breaks for user (PartitionKey query)
✅ Get specific break (Point query)
✅ Delete user's breaks (Partition scan)
❌ Get breaks by break type (Requires table scan or secondary index table)
```

### 3. UserDataItem Entity
```
Table: UserData
PartitionKey: {userId}
RowKey: {dataKey}

Properties:
- Value (string)
- CreatedAt (DateTime)
- UpdatedAt (DateTime)

Query Patterns Supported:
✅ Get all settings for user (PartitionKey query)
✅ Get specific setting (Point query)
✅ Upsert setting (Point operation)
✅ Natural unique constraint via PartitionKey + RowKey
```

### 4. BackgroundImage Entity
```
Table: BackgroundImages
PartitionKey: {userId} or "system"
RowKey: {imageId} (GUID)

Properties:
- FileName (string)
- Title (string)
- ThumbnailUrl (string)
- FullImageUrl (string)
- ThumbnailPath (string)
- FullImagePath (string)
- IsSystem (bool)
- UploadedAt (DateTime)
- CreatedAt (DateTime)
- UpdatedAt (DateTime)

Query Patterns Supported:
✅ Get user's images (PartitionKey query)
✅ Get system images (PartitionKey = "system")
❌ Get user + system images (Requires 2 queries)
```

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1)
1. **Azure Tables Client Configuration**
   - Add Azure.Data.Tables NuGet package
   - Configure connection strings for production and Azurite
   - Set up table initialization code

2. **Entity Model Creation**
   - Create TableEntity classes for each entity
   - Implement property mapping
   - Add validation attributes

3. **Repository Pattern Implementation**
   - Create IRepository interfaces
   - Implement Azure Tables repositories
   - Add retry policies and error handling

### Phase 2: Service Layer Migration (Week 2-3)
1. **Repository Implementation Order**
   ```
   Priority 1: UserDataItem (simplest, no relationships)
   Priority 2: BackgroundImage (independent entity)
   Priority 3: BreakType (referenced by Break)
   Priority 4: Break (has foreign key reference)
   ```

2. **Service Updates**
   - Update services to use new repositories
   - Implement application-level foreign key checks
   - Add client-side sorting for ordered queries
   - Implement compensating transactions

3. **Caching Strategy Enhancement**
   - Extend caching to compensate for limited querying
   - Cache frequently accessed system data
   - Implement cache warming on startup

### Phase 3: Data Migration (Week 4)
1. **Migration Tool Development**
   - Create console app for data migration
   - Implement parallel processing for large datasets
   - Add verification and rollback capabilities

2. **Migration Process**
   ```
   Step 1: Export PostgreSQL data to JSON
   Step 2: Transform primary keys (int → GUID)
   Step 3: Map foreign key references
   Step 4: Batch insert into Azure Tables
   Step 5: Verify data integrity
   ```

3. **Cutover Strategy**
   - Feature flag for gradual rollout
   - Side-by-side operation during transition
   - Fallback mechanism to PostgreSQL

### Phase 4: Cleanup and Optimization (Week 5)
1. **Remove PostgreSQL Dependencies**
   - Remove Entity Framework packages
   - Delete DbContext and migrations
   - Clean up connection strings

2. **Performance Optimization**
   - Implement batch operations
   - Optimize partition key usage
   - Add telemetry and monitoring

## Implementation Details

### Repository Interface Example
```csharp
public interface IBreakTypeRepository
{
    Task<BreakTypeEntity> GetAsync(string userId, string breakTypeId);
    Task<IEnumerable<BreakTypeEntity>> GetAllForUserAsync(string userId);
    Task<BreakTypeEntity> CreateAsync(string userId, CreateBreakTypeDto dto);
    Task<BreakTypeEntity> UpdateAsync(string userId, string breakTypeId, UpdateBreakTypeDto dto);
    Task DeleteAsync(string userId, string breakTypeId);
    Task DeleteAllForUserAsync(string userId);
}
```

### Handling Relationships
```csharp
// Before deletion of BreakType, check for dependent Breaks
public async Task DeleteBreakTypeAsync(string userId, string breakTypeId)
{
    // First, delete all breaks referencing this break type
    var breaks = await _breakRepository.GetByBreakTypeAsync(userId, breakTypeId);
    foreach (var break in breaks)
    {
        await _breakRepository.DeleteAsync(userId, break.RowKey);
    }

    // Then delete the break type
    await _breakTypeRepository.DeleteAsync(userId, breakTypeId);
}
```

### Handling Transactions
```csharp
// Compensating transaction pattern
public async Task BulkDeleteUserDataAsync(string userId)
{
    var deletedItems = new List<(string table, string rowKey)>();

    try
    {
        // Track deletions for potential rollback
        await DeleteAndTrack("Breaks", userId, deletedItems);
        await DeleteAndTrack("BreakTypes", userId, deletedItems);
        await DeleteAndTrack("UserData", userId, deletedItems);
        await DeleteAndTrack("BackgroundImages", userId, deletedItems);
    }
    catch (Exception ex)
    {
        // Implement compensation logic if needed
        // Log failure for manual intervention
        _logger.LogError(ex, "Bulk delete failed for user {UserId}", userId);
        throw;
    }
}
```

## Risk Mitigation

### High-Risk Areas
1. **Data Loss During Migration**
   - Mitigation: Comprehensive backup strategy
   - Validation: Row count and checksum verification

2. **Performance Degradation**
   - Mitigation: Aggressive caching, denormalization
   - Monitoring: Application Insights metrics

3. **Referential Integrity Issues**
   - Mitigation: Application-level checks
   - Testing: Comprehensive integration tests

### Rollback Plan
1. Keep PostgreSQL database intact during transition
2. Feature flags to switch between implementations
3. Data sync mechanism for parallel operation
4. Clear rollback procedures documented

## Success Criteria

### Technical Metrics
- ✅ All CRUD operations functional
- ✅ Data migration 100% complete with validation
- ✅ Query performance within 200ms p95
- ✅ Zero data loss during migration
- ✅ All integration tests passing

### Business Metrics
- ✅ No user-facing downtime
- ✅ Reduced infrastructure costs by 40%
- ✅ Improved scalability for 10x user growth
- ✅ Simplified deployment and maintenance

## Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Infrastructure | Azure Tables setup, Entity models, Base repositories |
| 2-3 | Service Layer | Repository implementations, Service updates, Testing |
| 4 | Data Migration | Migration tool, Data transfer, Validation |
| 5 | Optimization | Performance tuning, Monitoring, Documentation |
| 6 | Cutover | Production deployment, Monitoring, PostgreSQL decommission |

## Dependencies

### Technical Dependencies
- Azure.Data.Tables NuGet package
- Azurite for local development
- Azure Storage account for production

### Team Dependencies
- DevOps for Azure Storage provisioning
- QA for regression testing
- Product for feature flag management

## Open Questions

1. **Secondary Indexes**: Should we implement secondary index tables for complex queries?
2. **Backup Strategy**: How to handle backups with Azure Tables?
3. **Archive Strategy**: How to handle old data archival?
4. **Monitoring**: What specific metrics should we track?
5. **Cost Analysis**: Detailed cost comparison needed?

## Conclusion

This migration represents a significant architectural shift but aligns with cloud-native principles and will provide better scalability and cost efficiency. The phased approach minimizes risk while the service layer abstraction facilitates a smooth transition.

The key to success will be:
1. Thorough testing at each phase
2. Careful handling of relationships and transactions
3. Comprehensive data validation
4. Clear rollback procedures
5. Gradual rollout with feature flags

With proper execution, this migration will position Yuzu for improved performance, scalability, and reduced operational costs.