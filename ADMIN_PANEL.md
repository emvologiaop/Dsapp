# Admin Panel Documentation

This document describes the admin features added to the social media application, including user management, content moderation, and system monitoring.

## Features

### 1. Admin Dashboard
A comprehensive admin panel with the following capabilities:
- **User Management**: View, search, ban, and unban users
- **Content Moderation**: Delete posts and reels
- **Statistics Overview**: Monitor platform metrics
- **Real-time Search**: Search users by name, username, or email

### 2. Access Control
- Role-based access control (RBAC) with `user` and `admin` roles
- Admin-only routes protected by authentication and authorization middleware
- Banned users are automatically blocked from API access

### 3. Soft Delete
- Posts and reels are soft-deleted (marked as deleted but not removed from database)
- Deleted content is filtered from public feeds
- Admin actions are tracked with timestamps and admin IDs

## API Endpoints

### Admin User Management

#### Get All Users
```
GET /api/admin/users?userId=<adminId>&page=<page>&limit=<limit>&search=<query>
```
Returns paginated list of users with search capability.

#### Ban User
```
POST /api/admin/users/:userId/ban
Body: { "userId": "<adminId>", "reason": "<ban reason>" }
```
Bans a user with a specified reason. Cannot ban admin users.

#### Unban User
```
POST /api/admin/users/:userId/unban
Body: { "userId": "<adminId>" }
```
Removes ban from a user account.

### Admin Content Moderation

#### Get All Posts
```
GET /api/admin/posts?userId=<adminId>&page=<page>&limit=<limit>
```
Returns paginated list of all posts (including deleted ones).

#### Delete Post
```
DELETE /api/admin/posts/:postId
Body: { "userId": "<adminId>" }
```
Soft-deletes a post (marks as deleted).

#### Get All Reels
```
GET /api/admin/reels?userId=<adminId>&page=<page>&limit=<limit>
```
Returns paginated list of all reels (including deleted ones).

#### Delete Reel
```
DELETE /api/admin/reels/:reelId
Body: { "userId": "<adminId>" }
```
Soft-deletes a reel (marks as deleted).

### Admin Statistics

#### Get Platform Stats
```
GET /api/admin/stats?userId=<adminId>
```
Returns comprehensive platform statistics including:
- User counts (total, active, banned)
- Post counts (total, active, deleted)
- Reel counts (total, active, deleted)
- Recent users and posts

## Database Schema Changes

### User Model
New fields added:
```typescript
{
  role: 'user' | 'admin',          // User role (default: 'user')
  isBanned: boolean,                // Ban status (default: false)
  bannedAt?: Date,                  // Ban timestamp
  bannedBy?: ObjectId,              // Admin who banned the user
  banReason?: string                // Reason for ban
}
```

### Post Model
New fields added:
```typescript
{
  isDeleted: boolean,               // Deletion status (default: false)
  deletedAt?: Date,                 // Deletion timestamp
  deletedBy?: ObjectId              // Admin who deleted the post
}
```

### Reel Model
New fields added:
```typescript
{
  isDeleted: boolean,               // Deletion status (default: false)
  deletedAt?: Date,                 // Deletion timestamp
  deletedBy?: ObjectId              // Admin who deleted the reel
}
```

## Creating an Admin User

### Method 1: Using Seed Script (Recommended)
```bash
node seed-admin.js <email> <password>
```

Example:
```bash
node seed-admin.js admin@example.com securepass123
```

This will:
1. Connect to the database
2. Check if user exists
3. Create new admin user or promote existing user
4. Display login credentials

### Method 2: Manually via Database
Connect to MongoDB and update an existing user:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

## Frontend Access

### Accessing Admin Dashboard
1. Login with admin credentials
2. Navigate to **Settings** tab
3. Click on **Admin Dashboard** card (only visible to admins)
4. Admin dashboard will open with full access to all features

### Admin Dashboard Tabs

#### 1. Overview Tab
- Platform statistics cards
- Recent users list
- Recent posts list

#### 2. Users Tab
- Search users by name, username, or email
- View user details (role, ban status, etc.)
- Ban/unban users
- Pagination support

#### 3. Posts Tab
- View all posts (including deleted)
- Delete posts
- View post author and content
- Pagination support

#### 4. Reels Tab
- View all reels (including deleted)
- Delete reels
- View reel author and caption
- Pagination support

## Security Features

### Authentication Middleware
All admin routes are protected by:
1. **Authentication**: Verifies userId is valid
2. **Ban Check**: Prevents banned users from accessing API
3. **Authorization**: Ensures only admins can access admin routes

### Protection Against
- Unauthorized access to admin endpoints
- Admin users banning other admins
- Banned users accessing the platform
- Public access to deleted content

## Bug Fixes Implemented

1. **Deleted Content Filtering**: Posts and reels marked as deleted are now filtered from all public feeds
2. **Ban Protection**: Banned users cannot access the API
3. **Soft Delete**: Content is preserved for audit purposes instead of hard deletion
4. **Admin Protection**: Admins cannot be banned by other admins

## Future Enhancements (Optional)

1. **Activity Logs**: Track all admin actions in an audit log
2. **Bulk Actions**: Ban/unban multiple users or delete multiple posts at once
3. **User Reports**: Add reporting system for users to flag inappropriate content
4. **Advanced Filters**: Filter posts/reels by date range, user, or engagement metrics
5. **Admin Roles**: Add multiple admin levels (super admin, moderator, etc.)
6. **Content Review Queue**: Add approval workflow for flagged content

## Troubleshooting

### Cannot Access Admin Dashboard
- Verify user has `role: 'admin'` in database
- Check if user is logged in
- Ensure authentication is working properly

### Admin Routes Return 403
- Verify userId is being passed correctly
- Check if user role is 'admin' in database
- Ensure middleware is properly imported and applied

### Deleted Content Still Showing
- Check if `isDeleted` filter is applied in the query
- Verify recommendation service is updated
- Clear any cached data

## Testing Checklist

- [ ] Create admin user using seed script
- [ ] Login with admin credentials
- [ ] Access admin dashboard from settings
- [ ] View platform statistics
- [ ] Search for users
- [ ] Ban a user and verify they cannot access API
- [ ] Unban the user
- [ ] Delete a post and verify it's hidden from feed
- [ ] Delete a reel and verify it's hidden from feed
- [ ] Verify pagination works on all tabs
- [ ] Verify non-admin users cannot access admin dashboard
- [ ] Verify non-admin users cannot access admin API endpoints

## Support

For issues or questions:
- Report bugs via GitHub Issues
- Contact @Dev_Envologia on Telegram
