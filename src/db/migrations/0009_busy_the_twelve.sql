CREATE TABLE "check_in_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_user_id" text,
	"actor_role" text,
	"action" text NOT NULL,
	"reason" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "neon_auth"."users_sync_write" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"payload" jsonb,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "neon_auth"."users_sync" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "neon_auth"."users_sync" CASCADE;--> statement-breakpoint
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_user_id_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "attendees" DROP CONSTRAINT "attendees_user_id_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_list_requests" DROP CONSTRAINT "guest_list_requests_requester_id_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_list_requests" DROP CONSTRAINT "guest_list_requests_reviewed_by_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "proactive_guest_list" DROP CONSTRAINT "proactive_guest_list_added_by_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_users_sync_id_fk";
--> statement-breakpoint
ALTER TABLE "check_in_audit" ADD CONSTRAINT "check_in_audit_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_audit" ADD CONSTRAINT "check_in_audit_actor_user_id_users_sync_write_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_check_in_audit_event_id" ON "check_in_audit" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_check_in_audit_entity" ON "check_in_audit" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_check_in_audit_action" ON "check_in_audit" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_check_in_audit_created_at" ON "check_in_audit" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_webhook_provider_event" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_sync_write_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_user_id_users_sync_write_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_sync_write_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_requester_id_users_sync_write_id_fk" FOREIGN KEY ("requester_id") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_reviewed_by_users_sync_write_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proactive_guest_list" ADD CONSTRAINT "proactive_guest_list_added_by_users_sync_write_id_fk" FOREIGN KEY ("added_by") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_sync_write_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync_write"("id") ON DELETE no action ON UPDATE no action;