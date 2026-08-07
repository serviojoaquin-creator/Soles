export const realtimeContentTables = [
  "activities",
  "photos",
  "comments",
] as const;

export type RealtimeContentTable = (typeof realtimeContentTables)[number];
export type RealtimeOperation = "INSERT" | "UPDATE" | "DELETE";

export type TripContentEvent = {
  eventId: string;
  operation: RealtimeOperation;
  recordId: string;
  table: RealtimeContentTable;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseTripContentEvent(value: unknown): TripContentEvent | null {
  if (!isRecord(value)) return null;

  const { event_id, operation, record_id, table } = value;
  if (
    typeof event_id !== "string" ||
    typeof record_id !== "string" ||
    !realtimeContentTables.includes(table as RealtimeContentTable) ||
    !["INSERT", "UPDATE", "DELETE"].includes(String(operation))
  ) {
    return null;
  }

  return {
    eventId: event_id,
    operation: operation as RealtimeOperation,
    recordId: record_id,
    table: table as RealtimeContentTable,
  };
}

export class RealtimeRefreshCoordinator {
  private readonly seen = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly refresh: () => void,
    private readonly debounceMs = 250,
    private readonly deduplicationMs = 30_000,
  ) {}

  receive(event: TripContentEvent, now = Date.now()) {
    for (const [eventId, receivedAt] of this.seen) {
      if (now - receivedAt >= this.deduplicationMs) {
        this.seen.delete(eventId);
      }
    }

    if (this.seen.has(event.eventId)) return false;
    this.seen.set(event.eventId, now);

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refresh();
    }, this.debounceMs);

    return true;
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.seen.clear();
  }
}
