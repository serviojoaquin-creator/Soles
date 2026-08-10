import { describe, expect, it } from "vitest";

import { getTripFeedback } from "@/features/trips/feedback";
import {
  canActivateTrip,
  canDeleteTrip,
  canEditTrip,
  canFinalizeTrip,
  canReopenTrip,
} from "@/features/trips/permissions";
import { dashboardCategory } from "@/features/trips/presentation";
import {
  isValidIanaTimezone,
  lifecycleTripSchema,
  tripSchema,
} from "@/features/trips/schemas";

const validTrip = {
  name: "Ruta de los Siete Lagos",
  description: "Un viaje entre amigos.",
  destination: "Patagonia, Argentina",
  startDate: "2026-11-05",
  endDate: "2026-11-12",
  defaultTimezone: "America/Argentina/Buenos_Aires",
};

describe("trip validation", () => {
  it("accepts normalized trip data and a valid IANA timezone", () => {
    const result = tripSchema.parse({
      ...validTrip,
      name: "  Ruta de los Siete Lagos  ",
    });

    expect(result.name).toBe("Ruta de los Siete Lagos");
    expect(isValidIanaTimezone(result.defaultTimezone)).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      endDate: "2026-11-01",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid calendar dates and invented timezones", () => {
    expect(
      tripSchema.safeParse({ ...validTrip, startDate: "2026-02-31" }).success,
    ).toBe(false);
    expect(
      tripSchema.safeParse({ ...validTrip, defaultTimezone: "Buenos Aires" })
        .success,
    ).toBe(false);
  });
});

describe("trip presentation and permissions", () => {
  it("lets archive state take precedence over lifecycle sections", () => {
    expect(
      dashboardCategory(
        {
          default_timezone: "America/Argentina/Buenos_Aires",
          start_date: "2026-11-05",
          status: "active",
        },
        "2026-11-20T12:00:00Z",
      ),
    ).toBe("archived");
    expect(
      dashboardCategory(
        {
          default_timezone: "America/Argentina/Buenos_Aires",
          start_date: "2026-11-05",
          status: "planning",
        },
        null,
        new Date("2026-11-01T12:00:00Z"),
      ),
    ).toBe("upcoming");
    expect(
      dashboardCategory(
        {
          default_timezone: "America/Argentina/Buenos_Aires",
          start_date: "2026-11-05",
          status: "planning",
        },
        null,
        new Date("2026-11-05T12:00:00Z"),
      ),
    ).toBe("active");
    expect(
      dashboardCategory(
        {
          default_timezone: "America/Argentina/Buenos_Aires",
          start_date: "2026-11-05",
          status: "completed",
        },
        null,
      ),
    ).toBe("memories");
  });

  it("allows owner/admin edits but reserves activation for the owner", () => {
    expect(canEditTrip("owner")).toBe(true);
    expect(canEditTrip("admin")).toBe(true);
    expect(canEditTrip("member")).toBe(false);
    expect(canActivateTrip("owner")).toBe(true);
    expect(canActivateTrip("admin")).toBe(false);
    expect(canFinalizeTrip("owner")).toBe(true);
    expect(canFinalizeTrip("admin")).toBe(false);
    expect(canReopenTrip("owner")).toBe(true);
    expect(canReopenTrip("member")).toBe(false);
    expect(canDeleteTrip("owner")).toBe(true);
    expect(canDeleteTrip("admin")).toBe(false);
  });

  it("requires an explicit confirmation for finalizing and reopening", () => {
    expect(
      lifecycleTripSchema.safeParse({
        confirm: "yes",
        tripId: "3d11e21d-b10c-4421-af6a-f28d9e67182d",
      }).success,
    ).toBe(true);
    expect(
      lifecycleTripSchema.safeParse({
        confirm: "no",
        tripId: "3d11e21d-b10c-4421-af6a-f28d9e67182d",
      }).success,
    ).toBe(false);
  });

  it("maps only known feedback codes", () => {
    expect(getTripFeedback({ message: "trip_created" })?.kind).toBe("success");
    expect(getTripFeedback({ error: "<script>alert(1)</script>" })).toBeNull();
  });
});
