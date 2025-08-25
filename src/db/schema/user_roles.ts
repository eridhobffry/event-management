import { pgTable, primaryKey, integer, text } from "drizzle-orm/pg-core";
import { usersBase } from "./users";
import { roles } from "./roles";

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => usersBase.id),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  })
);
