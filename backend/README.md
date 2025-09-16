# Backend Setup Instructions

## Database Setup

The login is failing because the database tables haven't been created yet. Follow these steps to set up the database:

### 1. Create Database Tables in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database/schema.sql` into the SQL Editor
4. Run the SQL script to create all tables, indexes, and policies

### 2. Create Test Users

After creating the tables, run the test user creation script:

```bash
cd backend
node scripts/create-test-user.js
```

### 3. Test Login Credentials

Once the setup is complete, you can use these test accounts:

- **HR Admin**: `admin@company.com` / `admin123`
- **Manager**: `manager@company.com` / `manager123`
- **Employee**: `employee@company.com` / `employee123`

## Alternative: Quick Setup Script

If you prefer, you can also create a simple test user directly in Supabase:

1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user with email `test@company.com`
3. Then manually add the employee record in the Database → Table Editor

## Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## Troubleshooting

- If you get "table not found" errors, make sure you've run the schema.sql in Supabase
- If login returns 401, check that test users exist in the employees table
- Check the backend console logs for detailed error messages