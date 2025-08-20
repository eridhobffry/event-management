import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = process.env.GITHUB_WORKSPACE || process.cwd();

test("button has visible focus styles and CTA has aria-label", async () => {
  const button = await readFile(join(ROOT, "src/components/ui/button.tsx"), "utf8");
  expect(button.includes("focus-visible:ring-[3px]")).toBe(true);
  expect(button.includes("focus-visible:ring-ring/50")).toBe(true);

  const page = await readFile(join(ROOT, "src/app/page.tsx"), "utf8");
  const heroMarker = "/* Hero */";
  const socialMarker = "/* Social proof */";
  const heroStart = page.indexOf(heroMarker);
  const socialStart = page.indexOf(socialMarker);
  expect(heroStart).toBeGreaterThan(-1);
  expect(socialStart).toBeGreaterThan(heroStart);
  const heroBlock = page.slice(heroStart, socialStart);
  expect(heroBlock.includes('aria-label="Discover events"')).toBe(true);
});
