import { relations } from "drizzle-orm";
import { events } from "./events";
import { attendees } from "./attendees";
import { users } from "./users";
import { guestListRequests } from "./guest-list-requests";
import { proactiveGuestList } from "./proactive-guest-list";

export const eventsRelations = relations(events, ({ many, one }) => ({
  attendees: many(attendees),
  guestListRequests: many(guestListRequests),
  proactiveGuests: many(proactiveGuestList),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
}));

export const attendeesRelations = relations(attendees, ({ one, many }) => ({
  event: one(events, {
    fields: [attendees.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [attendees.userId],
    references: [users.id],
  }),
  guestListRequests: many(guestListRequests),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdEvents: many(events),
  attendeeRecords: many(attendees),
  guestListRequestsAsRequester: many(guestListRequests, {
    relationName: "requesterRequests",
  }),
  guestListRequestsAsReviewer: many(guestListRequests, {
    relationName: "reviewerRequests", 
  }),
  proactiveGuests: many(proactiveGuestList),
}));

export const guestListRequestsRelations = relations(guestListRequests, ({ one }) => ({
  event: one(events, {
    fields: [guestListRequests.eventId],
    references: [events.id],
  }),
  attendee: one(attendees, {
    fields: [guestListRequests.attendeeId],
    references: [attendees.id],
  }),
  requester: one(users, {
    fields: [guestListRequests.requesterId],
    references: [users.id],
    relationName: "requesterRequests",
  }),
  reviewer: one(users, {
    fields: [guestListRequests.reviewedBy],
    references: [users.id],
    relationName: "reviewerRequests",
  }),
}));

export const proactiveGuestListRelations = relations(proactiveGuestList, ({ one }) => ({
  event: one(events, {
    fields: [proactiveGuestList.eventId],
    references: [events.id],
  }),
  addedByUser: one(users, {
    fields: [proactiveGuestList.addedBy],
    references: [users.id],
  }),
}));