# RSVP Management System

## Overview

Our RSVP system manages free event registrations with automatic cleanup to ensure fair capacity management while encouraging ticket purchases.

## How It Works

### 1. RSVP Registration Flow

- User fills out registration form (name, email, phone)
- Free RSVP is created with 48-hour expiry
- Confirmation email sent immediately with purchase CTA
- User added to guest list

### 2. Email Notifications

- **Confirmation Email**: Sent immediately after RSVP
- **24-Hour Reminder**: Sent when RSVP expires in 24 hours
- **Purchase Encouragement**: Both emails include ticket purchase links

### 3. Automatic Cleanup

- RSVPs expire after 48 hours if no ticket purchased
- Expired RSVPs are automatically deleted
- Frees up capacity for other attendees

## Database Schema

### Attendees Table (Enhanced)

```sql
-- Core fields
id: uuid (primary key)
event_id: uuid (foreign key)
name: text
email: text
phone: text
registered_at: timestamp

-- RSVP management fields
rsvp_reminder_sent: timestamp (NULL until reminder sent)
will_attend: boolean (default true)
expiry_date: timestamp (default now() + 48 hours)
```

## API Endpoints

### RSVP Maintenance (Cron Job)

```
POST /api/rsvp/maintenance
Authorization: Bearer {CRON_SECRET}

Returns:
{
  "success": true,
  "remindersSent": 5,
  "rsvpsCleanedUp": 12,
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## Environment Variables

```bash
# Required for RSVP system
CRON_SECRET=your-secret-for-cron-jobs
BREVO_API_KEY=your-email-provider-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Cron Job Setup

### Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/rsvp/maintenance",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### External Cron Service

```bash
# Run every 6 hours
curl -X POST https://your-domain.com/api/rsvp/maintenance \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Email Templates

### Confirmation Email

- ✅ RSVP confirmed
- Event details
- Purchase ticket CTA
- 48-hour expiry notice

### 24-Hour Reminder

- ⏰ Expiring soon warning
- Ticket purchase CTA
- Event details link
- Automatic cleanup notice

## Features

### For Users

- Free RSVP to check interest
- Email confirmations
- 48-hour window to decide on tickets
- Clear upgrade path to paid tickets

### For Organizers

- Capacity management
- Interest validation
- Conversion tracking (RSVP → Purchase)
- Automatic cleanup prevents ghost registrations

### For System

- Database efficiency (auto-cleanup)
- Fair capacity allocation
- Email engagement tracking
- Revenue optimization

## Benefits

1. **Fair Access**: 48-hour limit prevents capacity hoarding
2. **Interest Validation**: Shows real demand vs casual interest
3. **Revenue Optimization**: Encourages ticket purchases
4. **Clean Data**: Automatic cleanup keeps database efficient
5. **User Experience**: Clear expectations and reminders

## Monitoring

Check maintenance logs:

```bash
# Manual run for testing
curl https://your-domain.com/api/rsvp/maintenance

# Check recent activity
tail -f logs/rsvp-maintenance.log
```

## Future Enhancements

- [ ] Waiting list for sold-out events
- [ ] Smart reminder timing based on event date
- [ ] A/B test different expiry windows
- [ ] Integration with calendar systems
- [ ] Social sharing incentives
