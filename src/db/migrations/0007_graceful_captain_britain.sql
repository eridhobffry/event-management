CREATE TABLE "guest_list_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"attendee_id" uuid NOT NULL,
	"requester_id" text,
	"requester_email" text NOT NULL,
	"requester_name" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"qr_code_token" uuid DEFAULT gen_random_uuid(),
	"requested_at" timestamp with time zone DEFAULT now(),
	"notification_sent" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "rsvp_reminder_sent" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "will_attend" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "expiry_date" timestamp with time zone DEFAULT now() + interval '48 hours';--> statement-breakpoint
ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_requester_id_users_sync_id_fk" FOREIGN KEY ("requester_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_reviewed_by_users_sync_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_guest_list_requests_event_id" ON "guest_list_requests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_guest_list_requests_status" ON "guest_list_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_guest_list_requests_attendee_id" ON "guest_list_requests" USING btree ("attendee_id");--> statement-breakpoint
CREATE INDEX "idx_guest_list_requests_requested_at" ON "guest_list_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "idx_attendees_expiry_reminder" ON "attendees" USING btree ("expiry_date","rsvp_reminder_sent");