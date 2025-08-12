"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface AttendeesFiltersProps {
  q: string;
  status: "all" | "checkedIn" | "pending";
}

export function AttendeesFilters({ q, status }: AttendeesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    q: z.string().trim().max(200, "Too long").catch("").default(""),
    status: z.enum(["all", "checkedIn", "pending"]).default("all"),
  });

  type Filters = { q: string; status: "all" | "checkedIn" | "pending" };

  const form = useForm<Filters>({
    defaultValues: { q, status },
    mode: "onSubmit",
  });

  function submit(nextPage: number = 1) {
    const values = schema.parse(form.getValues());
    const params = new URLSearchParams(searchParams?.toString());
    params.set("q", (values.q || "").trim());
    params.set("status", values.status);
    params.set("page", String(nextPage));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(1);
          }}
        >
          <input
            type="text"
            {...form.register("q")}
            placeholder="Search name or email"
            className="w-full sm:w-72 border rounded px-3 py-2 text-sm"
          />
          <select
            {...form.register("status")}
            className="w-full sm:w-48 border rounded px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="checkedIn">Checked In</option>
          </select>
          <Button
            type="submit"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
          >
            {isPending ? "Loading..." : "Apply"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
