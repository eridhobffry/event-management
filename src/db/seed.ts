// Seed file for initial database data
import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const main = async () => {
  console.log("🌱 Seeding database...");

  // Clear existing data (for clean seeding)
  console.log("🧹 Clearing existing data...");
  // Ticketing-related tables first to satisfy FK constraints
  await db.delete(schema.orderItems);
  await db.delete(schema.tickets);
  await db.delete(schema.orders);
  await db.delete(schema.ticketTypes);
  // Core data
  await db.delete(schema.attendees);
  await db.delete(schema.events);
  await db.delete(schema.rolePermissions);
  await db.delete(schema.userRoles);
  await db.delete(schema.roles);
  await db.delete(schema.permissions);

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

  console.log("🔑 Creating roles and permissions...");
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

  // Create sample events with realistic data
  console.log("🎪 Creating sample events...");
  const sampleEvents = [
    {
      name: "React Conference 2025",
      description:
        "The biggest React conference in Europe featuring top speakers from Meta, Vercel, and other leading companies. Join us for 2 days of cutting-edge presentations, workshops, and networking.",
      date: new Date("2025-09-15T09:00:00Z"),
      location: "Berlin Convention Center, Germany",
      expectations: [
        "Learn about the latest React 19 features",
        "Network with 500+ developers",
        "Hands-on workshops with React experts",
        "Free lunch and coffee breaks",
        "Access to conference recordings",
      ],
      isActive: true,
      createdBy: null,
    },
    {
      name: "Startup Pitch Night Hamburg",
      description:
        "Monthly startup pitch event where early-stage companies present to investors and fellow entrepreneurs. Great networking opportunity!",
      date: new Date("2025-08-20T18:00:00Z"),
      location: "Hamburg Startup Hub, Speicherstadt",
      expectations: [
        "See 8 innovative startup pitches",
        "Meet local investors and VCs",
        "Network with founders and entrepreneurs",
        "Free drinks and appetizers",
        "Voting for audience favorite",
      ],
      isActive: true,
      createdBy: null,
    },
    {
      name: "Digital Marketing Workshop",
      description:
        "Learn practical digital marketing strategies from industry experts. Covering SEO, social media, email marketing, and analytics.",
      date: new Date("2025-08-12T10:00:00Z"),
      location: "Munich Business Center, Room 301",
      expectations: [
        "Hands-on digital marketing training",
        "Latest SEO and social media strategies",
        "Interactive Q&A sessions",
        "Take-home resource kit",
        "Certificate of completion",
      ],
      isActive: true,
      createdBy: null,
    },
    {
      name: "AI & Machine Learning Meetup",
      description:
        "Monthly meetup for AI enthusiasts, researchers, and practitioners. This month focusing on LLMs and their practical applications.",
      date: new Date("2025-08-25T17:30:00Z"),
      location: "Frankfurt Tech Park, Building A",
      expectations: [
        "Expert talks on latest AI developments",
        "Demo of cutting-edge ML projects",
        "Networking with AI professionals",
        "Pizza and drinks provided",
        "Job opportunity discussions",
      ],
      isActive: true,
      createdBy: null,
    },
    {
      name: "Vintage Car Show",
      description:
        "Annual vintage car exhibition featuring classic automobiles from the 1920s to 1980s. Family-friendly event with food trucks and live music.",
      date: new Date("2025-09-08T11:00:00Z"),
      location: "Stuttgart Exhibition Grounds",
      expectations: [
        "150+ vintage cars on display",
        "Live jazz music performances",
        "Food trucks and craft beer",
        "Kids activities and face painting",
        "Photography contest",
      ],
      isActive: true,
      createdBy: null,
    },
    {
      name: "Wine Tasting Evening",
      description:
        "Exclusive wine tasting featuring premium wines from German vineyards. Limited to 30 participants for intimate experience.",
      date: new Date("2025-08-30T19:00:00Z"),
      location: "Cologne Wine Cellar, Historic District",
      expectations: [
        "Taste 6 premium German wines",
        "Learn from certified sommelier",
        "Cheese and charcuterie pairings",
        "Small group intimate setting",
        "Take home wine selection",
      ],
      isActive: true,
      createdBy: null,
    },
  ];

  const insertedEvents = await db
    .insert(schema.events)
    .values(sampleEvents)
    .returning();

  // Create sample paid ticket types for Stripe checkout testing
  console.log("🎟️ Creating sample ticket types...");
  const now = new Date();
  const insertedTicketTypes = await db
    .insert(schema.ticketTypes)
    .values([
      {
        eventId: insertedEvents[0].id, // React Conference 2025
        name: "General Admission",
        priceCents: 4999,
        currency: "usd",
        quantityTotal: 150,
        quantitySold: 0,
        saleStartsAt: new Date(now.getTime() - 3600_000), // started 1h ago
        saleEndsAt: new Date(now.getTime() + 30 * 24 * 3600_000), // +30 days
        isActive: true,
      },
      {
        eventId: insertedEvents[0].id,
        name: "VIP",
        priceCents: 12999,
        currency: "usd",
        quantityTotal: 30,
        quantitySold: 0,
        saleStartsAt: new Date(now.getTime() - 3600_000),
        saleEndsAt: new Date(now.getTime() + 30 * 24 * 3600_000),
        isActive: true,
      },
      {
        eventId: insertedEvents[1].id, // Startup Pitch Night Hamburg
        name: "Early Bird",
        priceCents: 1500,
        currency: "usd",
        quantityTotal: 50,
        quantitySold: 5,
        saleStartsAt: new Date(now.getTime() - 24 * 3600_000), // started yesterday
        saleEndsAt: new Date(now.getTime() + 7 * 24 * 3600_000), // +7 days
        isActive: true,
      },
    ])
    .returning();

  // Create realistic attendees for each event
  console.log("👥 Creating sample attendees...");
  const sampleAttendees = [
    // React Conference attendees (popular event)
    {
      eventId: insertedEvents[0].id,
      name: "Sarah Mueller",
      email: "sarah.mueller@techcorp.de",
      phone: "+49 30 12345678",
      userId: null,
    },
    {
      eventId: insertedEvents[0].id,
      name: "Max Weber",
      email: "max.weber@startup.io",
      phone: "+49 40 87654321",
      userId: null,
    },
    {
      eventId: insertedEvents[0].id,
      name: "Anna Schmidt",
      email: "anna.schmidt@freelancer.com",
      phone: null,
      userId: null,
    },
    {
      eventId: insertedEvents[0].id,
      name: "Thomas Becker",
      email: "t.becker@university.edu",
      phone: "+49 30 55566677",
      userId: null,
    },
    {
      eventId: insertedEvents[0].id,
      name: "Lisa Chen",
      email: "lisa.chen@bigtech.com",
      phone: "+49 89 11223344",
      userId: null,
    },
    {
      eventId: insertedEvents[0].id,
      name: "Michael Hoffmann",
      email: "m.hoffmann@agency.de",
      phone: "+49 30 99887766",
      userId: null,
    },
    {
      eventId: insertedEvents[0].id,
      name: "Julia Richter",
      email: "julia@designstudio.de",
      phone: null,
      userId: null,
    },

    // Startup Pitch Night attendees
    {
      eventId: insertedEvents[1].id,
      name: "Robert Klein",
      email: "robert@venture.capital",
      phone: "+49 40 12312312",
      userId: null,
    },
    {
      eventId: insertedEvents[1].id,
      name: "Emma Wagner",
      email: "emma.wagner@founder.co",
      phone: "+49 40 45645645",
      userId: null,
    },
    {
      eventId: insertedEvents[1].id,
      name: "David Park",
      email: "david@koreanstartup.kr",
      phone: "+49 40 78978978",
      userId: null,
    },
    {
      eventId: insertedEvents[1].id,
      name: "Sophie Fischer",
      email: "sophie@healthtech.de",
      phone: null,
      userId: null,
    },

    // Digital Marketing Workshop attendees
    {
      eventId: insertedEvents[2].id,
      name: "Marco Rossi",
      email: "marco@marketingpro.it",
      phone: "+49 89 33344455",
      userId: null,
    },
    {
      eventId: insertedEvents[2].id,
      name: "Nina Petrov",
      email: "nina.petrov@ecommerce.ru",
      phone: "+49 89 66677788",
      userId: null,
    },
    {
      eventId: insertedEvents[2].id,
      name: "James Wilson",
      email: "james@digitalagency.uk",
      phone: "+49 89 99900011",
      userId: null,
    },

    // AI Meetup attendees
    {
      eventId: insertedEvents[3].id,
      name: "Dr. Helen Zhang",
      email: "h.zhang@airesearch.org",
      phone: "+49 69 12121212",
      userId: null,
    },
    {
      eventId: insertedEvents[3].id,
      name: "Alexander Volkov",
      email: "alex@mlstartup.com",
      phone: "+49 69 34343434",
      userId: null,
    },
    {
      eventId: insertedEvents[3].id,
      name: "Marie Dubois",
      email: "marie@datalab.fr",
      phone: null,
      userId: null,
    },
    {
      eventId: insertedEvents[3].id,
      name: "Raj Patel",
      email: "raj@aicompany.in",
      phone: "+49 69 56565656",
      userId: null,
    },

    // Vintage Car Show attendees (family event)
    {
      eventId: insertedEvents[4].id,
      name: "Hans Mueller",
      email: "hans@carclub.de",
      phone: "+49 711 78787878",
      userId: null,
    },
    {
      eventId: insertedEvents[4].id,
      name: "Ingrid Weber",
      email: "ingrid.weber@gmail.com",
      phone: "+49 711 90909090",
      userId: null,
    },
    {
      eventId: insertedEvents[4].id,
      name: "Frank Schulz",
      email: "frank@vintage.enthusiast",
      phone: "+49 711 12312312",
      userId: null,
    },

    // Wine Tasting attendees (exclusive event)
    {
      eventId: insertedEvents[5].id,
      name: "Charlotte Beaumont",
      email: "charlotte@winelover.fr",
      phone: "+49 221 45454545",
      userId: null,
    },
    {
      eventId: insertedEvents[5].id,
      name: "Wilhelm Graf",
      email: "wilhelm@connoisseur.de",
      phone: "+49 221 67676767",
      userId: null,
    },
    {
      eventId: insertedEvents[5].id,
      name: "Isabella Romano",
      email: "isabella@sommelier.it",
      phone: null,
      userId: null,
    },
  ];

  await db.insert(schema.attendees).values(sampleAttendees);

  // Add extra attendees to first event to exceed 25 for pagination testing
  const extra: {
    eventId: string;
    name: string;
    email: string;
    phone: string | null;
    userId: string | null;
  }[] = [];
  for (let i = 1; i <= 30; i++) {
    extra.push({
      eventId: insertedEvents[0].id,
      name: `Test User ${i}`,
      email: `test.user${i}@example.com`,
      phone: null,
      userId: null,
    });
  }
  await db.insert(schema.attendees).values(extra);

  // Mark some attendees as checked in (for testing check-in status)
  console.log("✅ Marking some attendees as checked in...");
  const someAttendees = await db.select().from(schema.attendees).limit(8);
  for (let i = 0; i < Math.min(5, someAttendees.length); i++) {
    await db
      .update(schema.attendees)
      .set({ checkedIn: new Date(Date.now() - Math.random() * 86400000) }) // Random check-in time within last 24h
      .where(eq(schema.attendees.id, someAttendees[i].id));
  }

  console.log("🎉 Database seeded successfully!");
  console.log("📊 Created:");
  console.log(`   • ${insertedRoles.length} roles`);
  console.log(`   • ${insertedPermissions.length} permissions`);
  console.log(`   • ${insertedEvents.length} sample events`);
  console.log(`   • ${insertedTicketTypes.length} ticket types`);
  console.log(`   • ${sampleAttendees.length} sample attendees`);
  console.log("🔗 Ready to test attendee management features!");
};

main();
