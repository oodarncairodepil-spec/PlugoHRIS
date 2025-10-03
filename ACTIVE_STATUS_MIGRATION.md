# Database Migration Instructions - Active Status for Leave Types

## Adding is_active Column to leave_types Table

The `is_active` column needs to be manually added to the `leave_types` table using the Supabase SQL Editor.

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Execute the following SQL commands:**

```sql
-- Add active status column to leave_types table
-- This migration adds support for activating/deactivating leave types

-- Add the active column
ALTER TABLE leave_types 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN leave_types.is_active IS 'Indicates whether this leave type is active and available for use (true) or inactive (false)';

-- Set all existing leave types to active by default
UPDATE leave_types SET is_active = true WHERE is_active IS NULL;

-- Add index for better performance when filtering by active status
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);
```

3. **Verify the changes:**

```sql
-- Check that the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'leave_types' AND column_name = 'is_active';

-- View updated leave types with active status
SELECT id, name, is_active, created_at 
FROM leave_types 
ORDER BY name;
```

### What this migration does:

- **Adds `is_active` column**: A boolean field that defaults to `true`
- **Sets all existing leave types to active**: Ensures backward compatibility
- **Adds performance index**: Improves query performance when filtering by active status
- **Adds documentation**: Comments explain the purpose of the new column

### Frontend Integration:

The frontend will be updated to:
- Include an "Active" toggle switch in the Leave Types management page
- Display the active/inactive status in the Leave Types table
- Filter out inactive leave types from the submit request form
- Handle the field in all CRUD operations

### Backend Integration:

The backend controllers will be updated to:
- Accept `is_active` in create/update operations
- Include the field in API responses
- Filter active leave types in relevant endpoints
- Validate and process the boolean value correctly

### Next Steps:

After running the SQL migration:
1. Update the backend API to handle the `is_active` field
2. Update the frontend UI to include toggle switches
3. Test activating/deactivating leave types
4. Verify that inactive leave types don't appear in request forms
5. Ensure the toggle functionality works correctly in the admin interface