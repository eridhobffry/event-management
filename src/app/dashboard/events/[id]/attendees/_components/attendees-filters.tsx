import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AttendeesFiltersProps {
  q: string;
  status: "all" | "checkedIn" | "pending";
}

export function AttendeesFilters({ q, status }: AttendeesFiltersProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
          method="get"
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            className="w-full sm:w-72 border rounded px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={status}
            className="w-full sm:w-48 border rounded px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="checkedIn">Checked In</option>
          </select>
          <input type="hidden" name="page" value="1" />
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
