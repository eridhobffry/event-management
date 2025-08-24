import { relations } from "drizzle-orm";
import { events } from "./events";
import { attendees } from "./attendees";
import { usersBase } from "./users";
import { guestListRequests } from "./guest-list-requests";
import { proactiveGuestList } from "./proactive-guest-list";

export const eventsRelations = relations(events, ({ many, one }) => ({
  attendees: many(attendees),
  guestListRequests: many(guestListRequests),
  proactiveGuests: many(proactiveGuestList),
  creator: one(usersBase, {
    fields: [events.createdBy],
    references: [usersBase.id],
  }),
}));

export const attendeesRelations = relations(attendees, ({ one, many }) => ({
  event: one(events, {
    fields: [attendees.eventId],
    references: [events.id],
  }),
  user: one(usersBase, {
    fields: [attendees.userId],
    references: [usersBase.id],
  }),
  guestListRequests: many(guestListRequests),
}));

export const usersBaseRelations = relations(usersBase, ({ many }) => ({
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
  requester: one(usersBase, {
    fields: [guestListRequests.requesterId],
    references: [usersBase.id],
    relationName: "requesterRequests",
  }),
  reviewer: one(usersBase, {
    fields: [guestListRequests.reviewedBy],
    references: [usersBase.id],
    relationName: "reviewerRequests",
  }),
}));

export const proactiveGuestListRelations = relations(proactiveGuestList, ({ one }) => ({
  event: one(events, {
    fields: [proactiveGuestList.eventId],
    references: [events.id],
  }),
  addedByUser: one(usersBase, {
    fields: [proactiveGuestList.addedBy],
    references: [usersBase.id],
  }),
}));