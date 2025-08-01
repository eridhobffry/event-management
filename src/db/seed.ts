// Seed file for initial database data
import { db } from "../lib/db";
import * as schema from "./schema";

const main = async () => {
  console.log("Seeding database...");

  const roles = [
    { name: "Admin", description: "Full access to all features." },
    { name: "Promoter", description: "Can create and manage events." },
    { name: "Attendee", description: "Can view events and register." },
  ];

  const permissions = [
    { name: "users:manage", description: "Manage users and roles." },
    { name: "events:create", description: "Create new events." },
    { name: "events:read", description: "View event details." },
    { name: "events:update", description: "Update event information." },
    { name: "events:delete", description: "Delete events." },
    { name: "attendees:manage", description: "Manage event attendees." },
  ];

  const insertedRoles = await db.insert(schema.roles).values(roles).returning();
  const insertedPermissions = await db
    .insert(schema.permissions)
    .values(permissions)
    .returning();

  const rolePermissions = [
    // Admin
    {
      roleId: insertedRoles.find((r) => r.name === "Admin")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "users:manage")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Admin")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:create")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Admin")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:read")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Admin")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:update")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Admin")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:delete")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Admin")!.id,
      permissionId: insertedPermissions.find(
        (p) => p.name === "attendees:manage"
      )!.id,
    },
    // Promoter
    {
      roleId: insertedRoles.find((r) => r.name === "Promoter")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:create")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Promoter")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:read")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Promoter")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:update")!
        .id,
    },
    {
      roleId: insertedRoles.find((r) => r.name === "Promoter")!.id,
      permissionId: insertedPermissions.find(
        (p) => p.name === "attendees:manage"
      )!.id,
    },
    // Attendee
    {
      roleId: insertedRoles.find((r) => r.name === "Attendee")!.id,
      permissionId: insertedPermissions.find((p) => p.name === "events:read")!
        .id,
    },
  ];

  await db.insert(schema.rolePermissions).values(rolePermissions);

  console.log("Database seeded successfully!");
};

main();
