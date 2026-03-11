# Admin User Setup Guide

## Adding an Admin User

This guide explains how to add Envologia01@gmail.com (or any user) as an admin.

### Method 1: Using the Seed Script (Recommended)

The repository includes a seed script to create or promote users to admin role.

**Steps:**

1. Make sure you have Node.js installed and dependencies are installed:
   ```bash
   npm install
   ```

2. Set up your environment variables in `.env` or `.env.local`:
   ```bash
   MONGODB_URI=your_mongodb_connection_string
   ```

3. Run the seed script with the email and a secure password:
   ```bash
   node seed-admin.js Envologia01@gmail.com YOUR_SECURE_PASSWORD
   ```

**What the script does:**
- Checks if a user with that email already exists
- If the user exists and is already an admin, it confirms and exits
- If the user exists but is not an admin, it promotes them to admin
- If the user doesn't exist, it creates a new admin user with:
  - Role set to 'admin'
  - Email verified (isVerified: true)
  - A randomly generated Telegram auth code
  - A unique username (admin_timestamp)

**Output:**
```
✓ Admin user created successfully!

Admin Details:
  ID: 507f1f77bcf86cd799439011
  Name: Admin User
  Username: admin_1234567890
  Email: envologia01@gmail.com
  Role: admin

You can now login with:
  Email: envologia01@gmail.com
  Password: YOUR_SECURE_PASSWORD

After logging in, go to Settings to access the Admin Dashboard.
```

### Method 2: Direct Database Update

If you have direct access to your MongoDB database, you can promote an existing user:

```javascript
db.users.updateOne(
  { email: "envologia01@gmail.com" },
  { $set: { role: "admin" } }
)
```

Or using MongoDB Compass or any MongoDB client.

### Method 3: MongoDB Shell

```bash
# Connect to your MongoDB
mongosh "your_mongodb_uri"

# Switch to your database
use your_database_name

# Update the user
db.users.updateOne(
  { email: "envologia01@gmail.com" },
  { $set: { role: "admin" } }
)
```

## Accessing Admin Features

Once a user has the admin role:

1. **Login** to the web application with the admin credentials
2. **Navigate to Settings** (gear icon in the navigation)
3. **Admin Dashboard** tab will be visible (only to admins)
4. From the Admin Dashboard, you can:
   - View user statistics
   - Manage users (ban/unban)
   - Manage posts (delete inappropriate content)
   - Manage reels (delete inappropriate content)
   - View platform analytics

## Admin Permissions

Admins have special permissions:
- Access to Admin Dashboard
- Can ban/unban users (except other admins)
- Can delete any post or reel
- Can view platform statistics
- Cannot be banned by other admins

## Security Notes

- **Never commit passwords** to version control
- **Use strong passwords** for admin accounts
- **Keep admin credentials secure**
- **Limit the number of admin users** to maintain security
- **Regularly audit admin actions** through the database logs

## Troubleshooting

### Script fails with "Cannot find module"
Make sure you've run `npm install` first.

### "MONGODB_URI not found"
Set your MongoDB connection string in the `.env` or `.env.local` file.

### "Admin user already exists"
If you need to reset the password, you'll need to update it directly in the database or delete the user first.

### Cannot see Admin Dashboard after login
- Clear browser cache and cookies
- Verify the user's role in the database is set to 'admin'
- Check browser console for any errors
