import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseTripContentEvent,
  RealtimeRefreshCoordinator,
  type TripContentEvent,
} from "@/features/realtime/events";

const event: TripContentEvent = {
  eventId: "0f481e78-1a6a-4e6a-a321-9b86bf9b77ad",
  operation: "UPDATE",
  recordId: "65d50bea-95ee-4a98-b0ef-b7f926ec309b",
  table: "comments",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("Phase 9 Realtime event coordination", () => {
  it("accepts only the three approved content tables", () => {
    expect(
      parseTripContentEvent({
        event_id: event.eventId,
        operation: event.operation,
        record_id: event.recordId,
        table: event.table,
      }),
    ).toEqual(event);
    expect(
      parseTripContentEvent({
        event_id: event.eventId,
        operation: "UPDATE",
        record_id: event.recordId,
        table: "profiles",
      }),
    ).toBeNull();
  });

  it("deduplicates repeated deliveries and coalesces concurrent changes", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const coordinator = new RealtimeRefreshCoordinator(refresh, 250, 30_000);

    expect(coordinator.receive(event, 1_000)).toBe(true);
    expect(coordinator.receive(event, 1_001)).toBe(false);
    expect(
      coordinator.receive({ ...event, eventId: "second-event" }, 1_002),
    ).toBe(true);

    vi.advanceTimersByTime(249);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("cancels a scheduled refresh when the subscriber unmounts", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const coordinator = new RealtimeRefreshCoordinator(refresh);

    coordinator.receive(event);
    coordinator.dispose();
    vi.runAllTimers();

    expect(refresh).not.toHaveBeenCalled();
  });
});
