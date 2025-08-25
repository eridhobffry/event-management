# Guest List Request System

## Overview

A comprehensive VIP guest list management system that allows event attendees to request guest list access and enables organizers to approve/reject these requests with email notifications and QR code generation.

## Features

### For Attendees

- **Guest List Request**: After RSVP, users can request to be added to the VIP guest list
- **Reason Submission**: Optional field to explain why they should be on guest list
- **Status Tracking**: Real-time status updates (pending, approved, rejected)
- **Email Notifications**: Receive email updates about request status
- **QR Code Access**: Approved guests receive special QR codes for VIP entry
- **Proactive Recognition**: Get automatically recognized as VIP if pre-added by organizer

### For Organizers

- **Dashboard Management**: Centralized dashboard to review all guest list requests
- **Approval Workflow**: Easy approve/reject actions with optional review notes
- **Email Notifications**: Get notified when new requests are submitted
- **Request Analytics**: View stats on pending, approved, and rejected requests
- **Proactive Guest Management**: Pre-add VIP guests with CRUD operations
- **Automated VIP Detection**: System automatically recognizes pre-added guests during RSVP/purchase
- **Bulk Email Notifications**: Send personalized VIP invitations with QR codes

## Database Schema

### `guest_list_requests` Table

```sql
CREATE TABLE guest_list_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  requester_id TEXT REFERENCES neon_auth.users_sync(id),
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES neon_auth.users_sync(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  qr_code_token UUID DEFAULT gen_random_uuid(),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_sent TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_guest_list_requests_event_id ON guest_list_requests(event_id);
CREATE INDEX idx_guest_list_requests_status ON guest_list_requests(status);
CREATE INDEX idx_guest_list_requests_attendee_id ON guest_list_requests(attendee_id);
CREATE INDEX idx_guest_list_requests_requested_at ON guest_list_requests(requested_at);
```

### `proactive_guest_list` Table

```sql
CREATE TABLE proactive_guest_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_email TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_title TEXT, -- e.g., "VIP", "Speaker", "Sponsor"
  personal_message TEXT, -- Custom message for this guest
  added_by TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, archived, inactive
  qr_code_token UUID DEFAULT gen_random_uuid() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  notification_sent TIMESTAMPTZ,
  last_used TIMESTAMPTZ, -- When QR was last scanned

  -- Unique constraint: one guest per event
  CONSTRAINT unq_proactive_guest_list_event_guest UNIQUE (event_id, guest_email)
);

-- Indexes for performance
CREATE INDEX idx_proactive_guest_list_event_id ON proactive_guest_list(event_id);
CREATE INDEX idx_proactive_guest_list_guest_email ON proactive_guest_list(guest_email);
CREATE INDEX idx_proactive_guest_list_status ON proactive_guest_list(status);
CREATE INDEX idx_proactive_guest_list_qr_token ON proactive_guest_list(qr_code_token);
CREATE INDEX idx_proactive_guest_list_created_at ON proactive_guest_list(created_at);
```

## API Endpoints

### 1. Submit Guest List Request

**POST** `/api/guest-list/request`

```json
{
  "attendeeId": "uuid",
  "reason": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "requestId": "uuid",
  "status": "pending"
}
```

### 2. Check Request Status

**GET** `/api/guest-list/status?attendeeId=uuid`

**Response:**

```json
{
  "hasRequest": true,
  "status": "pending|approved|rejected",
  "requestedAt": "ISO string",
  "reviewedAt": "ISO string",
  "reviewNotes": "string"
}
```

### 3. Organizer: List Requests

**GET** `/api/guest-list/organizer/requests`

**Response:**

```json
{
  "requests": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventName": "string",
      "eventDate": "ISO string",
      "requesterName": "string",
      "requesterEmail": "string",
      "reason": "string",
      "status": "pending|approved|rejected",
      "requestedAt": "ISO string",
      "reviewedAt": "ISO string",
      "reviewNotes": "string"
    }
  ]
}
```

### 4. Respond to Request

**POST** `/api/guest-list/respond`

```json
{
  "requestId": "uuid",
  "action": "approve|reject",
  "reviewNotes": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "status": "approved|rejected",
  "reviewedAt": "ISO string"
}
```

## User Interface

### 1. Thanks Page Integration

After RSVP confirmation, users see:

- VIP guest list request button
- Optional reason textarea
- Real-time status updates
- Visual status indicators (pending, approved, rejected)

### 2. Organizer Dashboard

Located at `/dashboard/guest-list`:

- Overview statistics
- Pending requests section with approval/rejection actions
- Review notes functionality
- Historical decisions view

## Email System

### Email Types

#### 1. Organizer Notification (New Request)

- **Subject**: "🙋‍♂️ Guest List Request: [Event Name]"
- **Content**: Requester details, reason, action buttons
- **CTA**: Direct links to dashboard

#### 2. Approval Notification (With QR Code)

- **Subject**: "🎉 You're on the guest list: [Event Name]"
- **Content**: VIP confirmation, embedded QR code image
- **Features**: Professional design, clear instructions

#### 3. Rejection Notification

- **Subject**: "Guest List Request Update: [Event Name]"
- **Content**: Polite rejection with alternatives
- **Features**: Soft decline messaging, future opportunities

### QR Code Generation

- Generated using `qrcode` package
- Embedded as data URLs in emails
- Unique tokens for each approved request
- 200x200px size with error correction

## Navigation Integration

Added to main sidebar navigation:

- **Icon**: Crown (👑)
- **Location**: `/dashboard/guest-list`
- **Access**: Organizers only

## Security & Permissions

### Access Control

- Only event organizers can approve/reject requests
- Attendees can only view their own request status
- Database-level foreign key constraints

### Data Validation

- Required fields validation
- Email format validation
- UUID validation for all IDs
- Status enum validation

## File Structure

```
src/
├── app/
│   ├── api/guest-list/
│   │   ├── request/route.ts              # Submit request
│   │   ├── status/route.ts               # Check status
│   │   ├── respond/route.ts              # Approve/reject
│   │   └── organizer/requests/route.ts   # List requests
│   ├── dashboard/guest-list/
│   │   └── page.tsx                      # Organizer dashboard
│   └── events/[id]/register/thanks/
│       └── page.tsx                      # Updated thanks page
├── components/
│   └── ui/textarea.tsx                   # New textarea component
├── db/schema/
│   └── guest-list-requests.ts           # Database schema
└── lib/
    └── guest-list-notifications.ts      # Email templates
```

## Usage Examples

### 1. User Flow: Requesting Guest List Access

```typescript
// 1. User clicks "Request Guest List Access"
setGuestListState((prev) => ({ ...prev, showReason: true }));

// 2. User submits request
const response = await fetch("/api/guest-list/request", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    attendeeId: state.attendeeId,
    reason: guestListState.reason,
  }),
});

// 3. Update UI with status
setGuestListState((prev) => ({
  ...prev,
  hasRequest: true,
  status: "pending",
}));
```

### 2. Organizer Flow: Approving Request

```typescript
// 1. Organizer views dashboard
const requests = await fetch("/api/guest-list/organizer/requests");

// 2. Organizer approves request
const response = await fetch("/api/guest-list/respond", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requestId,
    action: "approve",
    reviewNotes: "Welcome to VIP access!",
  }),
});

// 3. Email sent automatically with QR code
```

## Performance Considerations

### Database Indexes

- Event ID index for organizer queries
- Status index for filtering
- Attendee ID index for status checks
- Requested date index for chronological sorting

### Email Optimization

- Async email sending (non-blocking)
- Error handling for email failures
- QR code caching potential

### UI Optimizations

- Optimistic updates for better UX
- Loading states for API calls
- Efficient re-renders with React state management

## Testing Considerations

### Unit Tests

- API endpoint validation
- Email template rendering
- QR code generation
- Database schema validation

### Integration Tests

- Full request/approval workflow
- Email delivery verification
- Dashboard functionality
- Access control validation

### E2E Tests

- User request submission
- Organizer approval flow
- Email reception verification
- QR code functionality

## Future Enhancements

### Phase 1 Improvements

- Bulk approval/rejection
- Request filtering and search
- Export guest list functionality
- Mobile-optimized dashboard

### Phase 2 Features

- Guest list capacity limits
- Automated approval rules
- Integration with check-in system
- Analytics and reporting

### Phase 3 Integrations

- Social media verification
- VIP tier management
- Event-specific guest list templates
- Advanced notification preferences

## Troubleshooting

### Common Issues

1. **Email not sending**

   - Check BREVO_API_KEY environment variable
   - Verify email address format
   - Check spam folders

2. **QR code not generating**

   - Ensure qrcode package is installed
   - Check token generation
   - Verify image embedding

3. **Database errors**

   - Check foreign key constraints
   - Verify migration applied
   - Validate UUID formats

4. **Permission issues**
   - Verify user authentication
   - Check event ownership
   - Validate organizer status

### Debug Commands

```bash
# Check database schema
npm run db:studio

# View email logs
grep "Email" logs/app.log

# Test QR generation
node -e "const QR = require('qrcode'); QR.toDataURL('test').then(console.log)"
```

## Support

For technical support or feature requests, contact the development team or create an issue in the project repository.
