import { db } from "@/lib/db";
import { roles, userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserRoleNames(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const rows = await db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return rows.map((r) => (r.name ?? "").toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

const ELEVATED = new Set(["organizer", "admin", "super_admin", "owner"]);

export async function isElevatedUser(userId: string): Promise<{ ok: boolean; roles: string[] }> {
  const names = await getUserRoleNames(userId);
  const ok = names.some((n) => ELEVATED.has(n));
  return { ok, roles: names };
}
