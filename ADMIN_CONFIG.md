# Admin Configuration Update

## Summary

This document describes the admin configuration that has been added to the codebase.

## Admin Details

The following admin details are now configured in the system:

- **Admin Email:** Envologia01@gmail.com
- **Telegram Username:** @Envologia
- **Telegram User ID:** 6882100039

## Implementation

### Environment Variables

The following environment variables have been added to `.env.example`:

```bash
# Admin Configuration
ADMIN_EMAIL="Envologia01@gmail.com"
ADMIN_TELEGRAM_USERNAME="@Envologia"
ADMIN_TELEGRAM_USER_ID="6882100039"
```

These can be overridden by setting them in your `.env` or `.env.local` file.

### Code Changes

#### `bot/index.ts`

Three constants have been added at the top of the file:

```typescript
// Admin Configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Envologia01@gmail.com';
const ADMIN_TELEGRAM_USERNAME = process.env.ADMIN_TELEGRAM_USERNAME || '@Envologia';
const ADMIN_TELEGRAM_USER_ID = process.env.ADMIN_TELEGRAM_USER_ID || '6882100039';
```

These constants are now used in:
- Bot initialization logging (displays admin config on startup)
- `/contact` command (shows admin contact information)
- `/support` command (shows technical support contact)

### Benefits

1. **Centralized Configuration:** Admin details are now defined in one place and can be easily updated
2. **Environment Variable Support:** Admin details can be overridden via environment variables for different environments
3. **Logging:** Admin configuration is logged on bot startup for easy verification
4. **Dynamic URLs:** Telegram URLs are dynamically generated from the username constant

## Usage

### Viewing Admin Configuration

When the bot starts, it will log the admin configuration:

```
Telegram Bot initializing with admin config:
  Admin Email: Envologia01@gmail.com
  Admin Telegram: @Envologia
  Admin User ID: 6882100039
```

### User Experience

Users can now interact with the bot using commands that show the admin contact information:

- **`/contact`** - Displays admin email and Telegram username with clickable buttons
- **`/support`** - Shows technical support information with admin contact details

### Creating the Admin User

To create the admin user in the database, run:

```bash
node seed-admin.js Envologia01@gmail.com <secure_password>
```

This will create a user with:
- Email: Envologia01@gmail.com
- Role: admin
- Access to Admin Dashboard

## Notes

- The admin email is already being used in the documentation and bot commands
- The Telegram username has been updated from @Dev_Envologia to @Envologia throughout the bot code
- The Telegram user ID (6882100039) is now available as a constant for future features that may need to check if a user is the admin
- All changes are backward compatible with default values if environment variables are not set
