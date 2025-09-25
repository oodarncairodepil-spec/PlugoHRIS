# Database Migration Instructions

## Adding requires_document Column to leave_types Table

The `requires_document` column needs to be manually added to the `leave_types` table using the Supabase SQL Editor.

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Execute the following SQL commands:**

```sql
-- Add requires_document column to leave_types table
ALTER TABLE leave_types ADD COLUMN requires_document BOOLEAN DEFAULT false;

-- Update existing leave types that might require documents
UPDATE leave_types SET requires_document = true WHERE name IN ('Sick Leave', 'Maternity Leave', 'Paternity Leave');

-- Add comment to document the purpose of this column
COMMENT ON COLUMN leave_types.requires_document IS 'Indicates whether this leave type requires supporting documents/images';
```

3. **Verify the changes:**

```sql
-- Check that the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'leave_types' AND column_name = 'requires_document';

-- View updated leave types
SELECT id, name, requires_approval, requires_document 
FROM leave_types 
ORDER BY name;
```

### What this migration does:

- **Adds `requires_document` column**: A boolean field that defaults to `false`
- **Updates specific leave types**: Sets `requires_document = true` for leave types that typically require medical certificates or other documentation
- **Adds documentation**: Comments explain the purpose of the new column

### Frontend Integration:

The frontend has been updated to:
- Include a "Requires Document" checkbox in the Leave Types form
- Display the requires_document status in the Leave Types table
- Handle the field in all CRUD operations

### Backend Integration:

The backend controllers have been updated to:
- Accept `requires_document` in create/update operations
- Include the field in API responses
- Validate and process the boolean value correctly

### Next Steps:

After running the SQL migration:
1. Test creating new leave types with the "Requires Document" option
2. Test updating existing leave types
3. Verify that the field displays correctly in the admin interface
4. Consider implementing document upload functionality for leave requests that require documentation