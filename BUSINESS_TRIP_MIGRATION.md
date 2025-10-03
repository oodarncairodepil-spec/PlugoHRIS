# Business Trip Tables Migration

This document provides instructions for adding business trip request functionality to the PlugoHRIS database.

## Database Changes Required

The business trip feature requires three new tables:
1. `business_trip_requests` - Main requests table
2. `business_trip_events` - Dynamic event rows for each trip
3. `business_trip_participants` - Many-to-many relationship for participants

## Manual Migration Steps

### Step 1: Execute SQL in Supabase SQL Editor

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `backend/database/create_business_trip_tables.sql`
4. Execute the SQL script

### Step 2: Verify Tables Creation

Run this query to verify the tables were created successfully:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'business_trip%'
ORDER BY table_name;
```

You should see:
- `business_trip_events`
- `business_trip_participants` 
- `business_trip_requests`

### Step 3: Verify RLS Policies

Check that Row Level Security policies were created:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename LIKE 'business_trip%'
ORDER BY tablename, policyname;
```

## Table Structure

### business_trip_requests
- `id` (UUID, Primary Key)
- `employee_id` (UUID, Foreign Key to employees)
- `destination` (TEXT) - City or Country destination
- `start_date` (DATE) - Trip start date
- `end_date` (DATE) - Trip end date
- `status` (VARCHAR) - Pending/Approved/Rejected
- `approved_by` (UUID, Foreign Key to employees)
- `approved_at` (TIMESTAMP)
- `rejection_reason` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### business_trip_events
- `id` (UUID, Primary Key)
- `business_trip_request_id` (UUID, Foreign Key)
- `event_name` (TEXT)
- `agenda` (TEXT)
- `event_date` (TEXT) - Free text format
- `event_time` (TEXT) - Free text format
- `meeting_location` (TEXT)
- `created_at` (TIMESTAMP)

### business_trip_participants
- `id` (UUID, Primary Key)
- `business_trip_request_id` (UUID, Foreign Key)
- `employee_id` (UUID, Foreign Key to employees)
- `created_at` (TIMESTAMP)
- Unique constraint on (business_trip_request_id, employee_id)

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Employees** can view/edit their own requests and requests they're participants in
- **Admin/HR** can view/manage all business trip requests
- **Participants** can view requests they're added to

## Next Steps

After running this migration:
1. Update backend controllers to handle business trip requests
2. Add API endpoints for CRUD operations
3. Create frontend components for business trip request forms
4. Implement participant search and selection
5. Update "My Requests" page to show business trip requests

## Rollback (if needed)

To remove the business trip tables:

```sql
DROP TABLE IF EXISTS business_trip_participants CASCADE;
DROP TABLE IF EXISTS business_trip_events CASCADE;
DROP TABLE IF EXISTS business_trip_requests CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```