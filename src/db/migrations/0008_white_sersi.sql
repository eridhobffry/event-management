CREATE TABLE "proactive_guest_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_email" text NOT NULL,
	"guest_name" text NOT NULL,
	"guest_title" text,
	"personal_message" text,
	"added_by" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"qr_code_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"archived_at" timestamp with time zone,
	"notification_sent" timestamp with time zone,
	"last_used" timestamp with time zone,
	CONSTRAINT "unq_proactive_guest_list_event_guest" UNIQUE("event_id","guest_email")
);
--> statement-breakpoint
ALTER TABLE "proactive_guest_list" ADD CONSTRAINT "proactive_guest_list_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proactive_guest_list" ADD CONSTRAINT "proactive_guest_list_added_by_users_sync_id_fk" FOREIGN KEY ("added_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_proactive_guest_list_event_id" ON "proactive_guest_list" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_proactive_guest_list_guest_email" ON "proactive_guest_list" USING btree ("guest_email");--> statement-breakpoint
CREATE INDEX "idx_proactive_guest_list_status" ON "proactive_guest_list" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_proactive_guest_list_qr_token" ON "proactive_guest_list" USING btree ("qr_code_token");--> statement-breakpoint
CREATE INDEX "idx_proactive_guest_list_created_at" ON "proactive_guest_list" USING btree ("created_at");