import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = process.env.GITHUB_WORKSPACE || process.cwd();

test("landing hero: single CTA to discovery, anchor present, social proof text", async () => {
  const content = await readFile(join(ROOT, "src/app/page.tsx"), "utf8");
  const heroMarker = "/* Hero */";
  const socialMarker = "/* Social proof */";
  const heroStart = content.indexOf(heroMarker);
  const socialStart = content.indexOf(socialMarker);
  expect(heroStart).toBeGreaterThan(-1);
  expect(socialStart).toBeGreaterThan(heroStart);
  const heroBlock = content.slice(heroStart, socialStart);
  const discoverHref = 'href="#discover"';
  const discoverCount = (heroBlock.match(new RegExp(discoverHref, "g")) || [])
    .length;
  expect(discoverCount).toBe(1);
  expect(heroBlock.includes("/organizer/overview")).toBe(false);
  expect(content.includes('<main id="discover"')).toBe(true);
  expect(
    content.includes("Trusted by community venues and indie organizers")
  ).toBe(true);
});
