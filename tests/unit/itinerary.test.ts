import { describe, expect, it } from "vitest";

import { canEditActivity } from "@/features/itinerary/permissions";
import {
  groupActivitiesByDay,
  sortActivities,
  type ActivityRow,
} from "@/features/itinerary/presentation";
import {
  activitySchema,
  isActivityOutsideTrip,
} from "@/features/itinerary/schemas";

const validActivity = {
  activityDate: "2026-11-07",
  confirmOutsideRange: "" as const,
  description: "Llegar quince minutos antes.",
  endTime: "11:30",
  locationName: "Centro Cívico",
  startTime: "10:00",
  timezone: "America/Argentina/Buenos_Aires",
  title: "Visita guiada",
  tripId: "3d11e21d-b10c-4421-af6a-f28d9e67182d",
};

function activity(
  id: string,
  activityDate: string,
  startTime: string | null,
  position: number,
): ActivityRow {
  return {
    activity_date: activityDate,
    created_at: `2026-07-23T10:00:0${position}Z`,
    created_by: "8c86bab4-78ef-4ced-8ca0-d48cba44c24c",
    deleted_at: null,
    description: null,
    end_time: null,
    id,
    latitude: null,
    location_name: null,
    longitude: null,
    position,
    start_time: startTime,
    status: "planned",
    timezone: "America/Argentina/Buenos_Aires",
    title: id,
    trip_id: validActivity.tripId,
    updated_at: "2026-07-23T10:00:00Z",
  };
}

describe("itinerary validation", () => {
  it("accepts local times with an explicit IANA timezone", () => {
    expect(activitySchema.parse(validActivity)).toMatchObject({
      startTime: "10:00",
      timezone: "America/Argentina/Buenos_Aires",
    });
  });

  it("rejects impossible dates, invalid timezones, and reversed times", () => {
    expect(
      activitySchema.safeParse({
        ...validActivity,
        activityDate: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      activitySchema.safeParse({ ...validActivity, timezone: "Buenos Aires" })
        .success,
    ).toBe(false);
    expect(
      activitySchema.safeParse({
        ...validActivity,
        endTime: "09:00",
      }).success,
    ).toBe(false);
  });

  it("requires a start time whenever an end time is supplied", () => {
    expect(
      activitySchema.safeParse({ ...validActivity, startTime: "" }).success,
    ).toBe(false);
  });

  it("detects dates outside the trip without silently changing them", () => {
    expect(
      isActivityOutsideTrip("2026-11-04", "2026-11-05", "2026-11-12"),
    ).toBe(true);
    expect(
      isActivityOutsideTrip("2026-11-12", "2026-11-05", "2026-11-12"),
    ).toBe(false);
  });
});

describe("itinerary ordering and permissions", () => {
  it("orders by day, local time, position, and leaves untimed items last", () => {
    const input = [
      activity("untimed", "2026-11-07", null, 1000),
      activity("later", "2026-11-07", "12:00:00", 1000),
      activity("second", "2026-11-07", "09:00:00", 2000),
      activity("first", "2026-11-07", "09:00:00", 1000),
      activity("previous-day", "2026-11-06", null, 1000),
    ];

    expect(sortActivities(input).map(({ id }) => id)).toEqual([
      "previous-day",
      "first",
      "second",
      "later",
      "untimed",
    ]);
    expect(groupActivitiesByDay(input).map(({ date }) => date)).toEqual([
      "2026-11-06",
      "2026-11-07",
    ]);
  });

  it("allows managers or the author, but not another regular member", () => {
    const authorId = "author";
    expect(canEditActivity("owner", "owner", authorId)).toBe(true);
    expect(canEditActivity("admin", "admin", authorId)).toBe(true);
    expect(canEditActivity("member", authorId, authorId)).toBe(true);
    expect(canEditActivity("member", "someone-else", authorId)).toBe(false);
  });
});
