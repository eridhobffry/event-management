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
        <form method="get">
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="pageSize" value={pageSize} />
          <input type="hidden" name="page" value={Math.max(1, page - 1)} />
          <Button variant="outline" size="sm" disabled={page <= 1}>
            Previous
          </Button>
        </form>
        <form method="get">
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="pageSize" value={pageSize} />
          <input type="hidden" name="page" value={page + 1} />
          <Button variant="outline" size="sm" disabled={!pageCountHasNext}>
            Next
          </Button>
        </form>
      </div>
    </div>
  );
}
