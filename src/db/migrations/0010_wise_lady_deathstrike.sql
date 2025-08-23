CREATE TABLE IF NOT EXISTS "neon_auth"."users_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text
);
--> statement-breakpoint
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "attendees" DROP CONSTRAINT IF EXISTS "attendees_user_id_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "check_in_audit" DROP CONSTRAINT IF EXISTS "check_in_audit_actor_user_id_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_created_by_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_list_requests" DROP CONSTRAINT IF EXISTS "guest_list_requests_requester_id_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_list_requests" DROP CONSTRAINT IF EXISTS "guest_list_requests_reviewed_by_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "proactive_guest_list" DROP CONSTRAINT IF EXISTS "proactive_guest_list_added_by_users_sync_write_id_fk";
--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_users_sync_write_id_fk";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendees" ADD CONSTRAINT "attendees_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "check_in_audit" ADD CONSTRAINT "check_in_audit_actor_user_id_users_sync_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_sync_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_requester_id_users_sync_id_fk" FOREIGN KEY ("requester_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "guest_list_requests" ADD CONSTRAINT "guest_list_requests_reviewed_by_users_sync_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "proactive_guest_list" ADD CONSTRAINT "proactive_guest_list_added_by_users_sync_id_fk" FOREIGN KEY ("added_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;