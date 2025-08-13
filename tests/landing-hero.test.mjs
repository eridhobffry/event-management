import { readFile } from "node:fs/promises";

const ROOT = "/Users/eridhobufferyrollian/Documents/Project/event-management";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

try {
  const content = await readFile(`${ROOT}/src/app/page.tsx`, "utf8");

  const heroMarker = "/* Hero */";
  const socialMarker = "/* Social proof */";
  const heroStart = content.indexOf(heroMarker);
  const socialStart = content.indexOf(socialMarker);

  assert(heroStart !== -1, "Hero section marker not found");
  assert(socialStart !== -1, "Social proof marker not found");
  assert(socialStart > heroStart, "Social proof should come after hero");

  const heroBlock = content.slice(heroStart, socialStart);

  // Single unambiguous CTA in hero linking to discovery
  const discoverHref = 'href="#discover"';
  const discoverCount = (heroBlock.match(new RegExp(discoverHref, "g")) || []).length;
  assert(discoverCount === 1, `Expected 1 primary CTA to #discover in hero, found ${discoverCount}`);

  // Ensure no organizer CTA in hero
  assert(!heroBlock.includes("/organizer/overview"), "Organizer CTA must not be in hero");

  // Discovery section anchor present
  assert(content.includes('<main id="discover"'), "Discovery section id=\"discover\" missing");

  // Social proof text present
  assert(
    content.includes("Trusted by community venues and indie organizers"),
    "Social proof copy missing"
  );

  console.log("PASS: Landing hero structure and CTA verified");
  process.exit(0);
} catch (err) {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
}


