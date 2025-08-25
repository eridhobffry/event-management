import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AttendeesPaginationProps {
  q: string;
  status: "all" | "checkedIn" | "pending";
  page: number;
  pageSize: number;
  pageCountHasNext: boolean;
  showingCount: number;
  totalCount: number;
}

export function AttendeesPagination({
  q,
  status,
  page,
  pageSize,
  pageCountHasNext,
  showingCount,
  totalCount,
}: AttendeesPaginationProps) {
  return (
    <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
      <div>
        Page {page} · Showing {showingCount} of {totalCount}
      </div>
      <div className="flex items-center gap-2">
        {/* Client-side navigation to avoid full page reloads */}
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page <= 1}
        >
          <Link
            href={`?q=${encodeURIComponent(q)}&status=${status}&pageSize=${pageSize}&page=${Math.max(
              1,
              page - 1
            )}`}
            aria-disabled={page <= 1}
          >
            Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={!pageCountHasNext}
        >
          <Link
            href={`?q=${encodeURIComponent(q)}&status=${status}&pageSize=${pageSize}&page=${
              page + 1
            }`}
            aria-disabled={!pageCountHasNext}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}
