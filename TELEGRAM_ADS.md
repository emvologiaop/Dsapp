# Telegram Ad Feature Documentation

## Overview

This document describes the complete advertisement system integrated with the DDU Social Telegram bot. Admins can create, manage, and track advertisements that are displayed to users via the Telegram bot.

## Features

### For Admins
- Create and manage ads through the Admin Dashboard
- Set ad visibility periods (start/end dates)
- Target specific audiences (all users, verified users, or admins only)
- Track ad performance (impressions, clicks, CTR)
- Toggle ads active/inactive
- Add images and clickable links to ads

### For Users
- View active ads using `/ads` command in Telegram bot
- Click links in ads (tracked for analytics)
- Receive ads with images when available

## Architecture

### Database Model

**Location:** `src/models/Ad.ts`

```typescript
interface IAd {
  title: string;              // Ad title (max 100 chars)
  content: string;            // Ad content (max 500 chars)
  imageUrl?: string;          // Optional image URL
  linkUrl?: string;           // Optional clickable link
  isActive: boolean;          // Active status
  startDate?: Date;           // Optional campaign start date
  endDate?: Date;             // Optional campaign end date
  targetAudience: 'all' | 'verified' | 'admins';
  impressions: number;        // View count
  clicks: number;             // Click count
  createdBy: ObjectId;        // Admin who created the ad
  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

All endpoints require admin authentication (`authenticate` + `requireAdmin` middleware).

**Base Path:** `/api/admin/ads`

#### 1. List Ads
```
GET /api/admin/ads?page=1&limit=20&isActive=true
```
**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `isActive` - Filter by active status (optional)

**Response:**
```json
{
  "ads": [...],
  "totalPages": 5,
  "currentPage": 1,
  "totalAds": 95
}
```

#### 2. Get Single Ad
```
GET /api/admin/ads/:adId
```
Returns complete ad details including creator information.

#### 3. Create Ad
```
POST /api/admin/ads?userId=<adminId>
Content-Type: application/json

{
  "title": "New Feature Launch",
  "content": "Check out our latest feature...",
  "imageUrl": "https://example.com/image.jpg",
  "linkUrl": "https://example.com/features",
  "isActive": true,
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "targetAudience": "all"
}
```

#### 4. Update Ad
```
PUT /api/admin/ads/:adId
Content-Type: application/json

{
  "isActive": false
}
```
All fields are optional. Only provided fields will be updated.

#### 5. Delete Ad
```
DELETE /api/admin/ads/:adId
```
Permanently removes the ad from the database.

#### 6. Get Ad Statistics
```
GET /api/admin/ads/stats/summary?userId=<adminId>
```
**Response:**
```json
{
  "totalAds": 50,
  "activeAds": 30,
  "inactiveAds": 20,
  "totalImpressions": 15000,
  "totalClicks": 450,
  "clickThroughRate": "3.00"
}
```

### Telegram Bot Integration

**Location:** `bot/index.ts`

#### /ads Command

Users can type `/ads` in the bot to view active advertisements.

**Behavior:**
1. Fetches up to 5 active ads that match current date criteria
2. Increments impression count for each viewed ad
3. Displays ads with:
   - Title and content
   - Image (if provided)
   - Clickable "Learn More" button (if link provided)
4. Tracks clicks when users interact with ad buttons

**Example Bot Response:**
```
📢 Active Advertisements (3)

Here are the latest ads from DDU Social:

---

[Image if available]

New Feature Launch

Check out our latest feature that helps you connect with friends!

[🔗 Learn More] <- Clickable button
```

#### Click Tracking

When users click the "Learn More" button:
1. Click count is incremented in the database
2. User is directed to the link URL
3. Callback query is answered with "✅ Opening link..."

### Admin UI Component

**Location:** `src/components/AdManagement.tsx`

#### Features

**Dashboard Stats:**
- Total ads count (active/inactive breakdown)
- Total impressions across all ads
- Total clicks and CTR percentage

**Ad List:**
- View all ads with pagination
- Filter by active/inactive status
- See performance metrics per ad
- Quick toggle active/inactive
- Edit and delete buttons

**Create/Edit Form:**
- Title (required, max 100 chars)
- Content (required, max 500 chars)
- Image URL (optional)
- Link URL (optional)
- Start Date (optional)
- End Date (optional)
- Target Audience selection
- Active checkbox

## Usage Guide

### For Admins

#### Creating an Ad

1. **Login** to the web application as an admin
2. Navigate to **Settings → Admin Dashboard**
3. Click the **Ads** tab
4. Click **Create Ad** button
5. Fill in the form:
   - **Title:** Short, catchy title
   - **Content:** Detailed description (supports markdown in Telegram)
   - **Image URL:** Public URL to an image (optional)
   - **Link URL:** Where users should be directed (optional)
   - **Dates:** Set campaign duration (optional)
   - **Target Audience:** Choose who sees the ad
   - **Active:** Check to activate immediately
6. Click **Create Ad**

#### Editing an Ad

1. Find the ad in the list
2. Click the **Edit** (pencil) icon
3. Modify any fields
4. Click **Update Ad**

#### Activating/Deactivating an Ad

- Click the **Power** button icon on any ad to toggle its status
- Green power icon = Activate
- Red power-off icon = Deactivate

#### Deleting an Ad

1. Click the **Trash** icon on the ad
2. Confirm deletion
3. Ad is permanently removed (cannot be undone)

#### Viewing Statistics

- Overall stats are shown at the top of the Ads tab
- Individual ad stats are shown in each ad card:
  - Impressions (views)
  - Clicks
  - CTR (Click-Through Rate)

### For Users

#### Viewing Ads

1. Open Telegram and find the DDU Social Bot
2. Type `/ads` and send
3. Bot will display active advertisements
4. Click "Learn More" buttons to visit links
5. View images by scrolling through ad messages

## Best Practices

### For Creating Effective Ads

1. **Keep titles short and compelling** - Users see titles first
2. **Use clear calls-to-action** - "Sign up now", "Learn more", etc.
3. **Include images** - Visual ads get more engagement
4. **Add links** - Make it easy for users to take action
5. **Test your links** - Ensure they work before publishing
6. **Set appropriate dates** - Use start/end dates for time-sensitive campaigns
7. **Monitor performance** - Check CTR and adjust content accordingly

### Ad Content Guidelines

- **Be concise** - Telegram users prefer short messages
- **Use emojis sparingly** - One or two relevant emojis max
- **Markdown formatting** - Use `*bold*` and `_italic_` for emphasis
- **Clear value proposition** - What's in it for the user?
- **Mobile-friendly links** - Test links on mobile devices

### Performance Benchmarks

- **Good CTR:** 2-5% or higher
- **Average CTR:** 0.5-2%
- **Low CTR:** Below 0.5% (consider revising content)

**Note:** CTR varies by industry and audience. Monitor your specific metrics.

## Troubleshooting

### Ad not showing in bot

**Possible causes:**
1. Ad is not active (check `isActive` status)
2. Current date is outside start/end date range
3. Target audience doesn't match user
4. Database connection issues

**Solution:**
- Check ad status in Admin Dashboard
- Verify dates are correct
- Check server logs for errors

### Image not displaying

**Possible causes:**
1. Image URL is broken or not public
2. Telegram cannot access the image
3. Image format not supported

**Solution:**
- Test image URL in browser
- Ensure image is publicly accessible
- Use common formats (JPEG, PNG, GIF)
- Consider using Telegram's file hosting

### Clicks not being tracked

**Possible causes:**
1. User clicked external link instead of bot button
2. Database write issues
3. Network connectivity problems

**Solution:**
- Only bot button clicks are tracked
- Check server logs for database errors
- Verify MongoDB connection is stable

### Performance Issues

If the bot is slow when displaying ads:
1. Reduce the number of active ads
2. Optimize image sizes
3. Check database query performance
4. Consider adding pagination for ads

## Security Considerations

1. **Admin-only access** - Only admins can create/edit ads
2. **Input validation** - Title and content have character limits
3. **XSS prevention** - User input is sanitized
4. **Rate limiting** - Bot commands are rate-limited
5. **URL validation** - Links should be validated before saving

## Future Enhancements

Potential improvements for the ad system:

1. **Scheduling** - Automated ad activation/deactivation
2. **A/B Testing** - Test different ad versions
3. **Advanced Analytics** - Click sources, user demographics
4. **Ad Rotation** - Show different ads to the same user
5. **Budget Tracking** - Set cost per impression/click
6. **Notification Integration** - Send ads as push notifications
7. **Template System** - Pre-designed ad templates
8. **Media Upload** - Direct image upload instead of URLs
9. **Audience Segmentation** - More granular targeting
10. **Performance Reports** - Exportable analytics reports

## API Integration Examples

### Create Ad via API

```bash
curl -X POST https://your-domain.com/api/admin/ads?userId=ADMIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Summer Sale",
    "content": "Get 50% off all premium features this month!",
    "imageUrl": "https://example.com/summer-sale.jpg",
    "linkUrl": "https://example.com/pricing",
    "isActive": true,
    "targetAudience": "all"
  }'
```

### Get Ad Statistics

```bash
curl https://your-domain.com/api/admin/ads/stats/summary?userId=ADMIN_ID
```

### Toggle Ad Status

```bash
curl -X PUT https://your-domain.com/api/admin/ads/AD_ID \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

## Support

For issues or questions about the ad system:
- Telegram: @Dev_Envologia
- Email: Envologia01@gmail.com
- GitHub Issues: Create an issue in the repository

## Version History

- **v1.0.0** (2026-03-11) - Initial ad system implementation
  - Basic CRUD operations
  - Telegram bot integration
  - Admin UI component
  - Impression and click tracking
  - Statistics dashboard
