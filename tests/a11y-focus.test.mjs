import { readFile } from "node:fs/promises";

const ROOT = "/Users/eridhobufferyrollian/Documents/Project/event-management";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

try {
  const button = await readFile(`${ROOT}/src/components/ui/button.tsx`, "utf8");
  assert(
    button.includes("focus-visible:ring-[3px]") &&
      button.includes("focus-visible:ring-ring/50"),
    "Button component must include visible focus ring styles"
  );

  const page = await readFile(`${ROOT}/src/app/page.tsx`, "utf8");
  const heroMarker = "/* Hero */";
  const socialMarker = "/* Social proof */";
  const heroStart = page.indexOf(heroMarker);
  const socialStart = page.indexOf(socialMarker);
  assert(heroStart !== -1 && socialStart !== -1, "Hero/social markers missing");
  const heroBlock = page.slice(heroStart, socialStart);

  assert(
    heroBlock.includes('aria-label="Discover events"'),
    "Primary CTA should have aria-label for clarity and accessibility"
  );

  console.log("PASS: Focus styles and CTA accessibility verified");
  process.exit(0);
} catch (err) {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
}


