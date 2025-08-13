import { expect, test } from "vitest";
import { inferEventCategory, listCategories } from "@/lib/event-category";

test("inferEventCategory maps names/descriptions to labels", () => {
  expect(
    inferEventCategory({ name: "React Conference 2025", description: "Talks" })
  ).toBe("Conference");
  expect(
    inferEventCategory({ name: "Digital Marketing Workshop", description: "" })
  ).toBe("Workshop");
  expect(
    inferEventCategory({
      name: "AI & Machine Learning Meetup",
      description: "",
    })
  ).toBe("Meetup");
  expect(
    inferEventCategory({ name: "Wine Tasting Evening", description: "" })
  ).toBe("Tasting");
});

test("listCategories returns sorted unique labels", () => {
  const events = [
    { name: "React Conference 2025", description: "Talks" },
    { name: "Digital Marketing Workshop", description: "Hands-on" },
    { name: "AI Meetup", description: "Networking" },
  ];
  expect(listCategories(events)).toEqual(["Conference", "Meetup", "Workshop"]);
});
