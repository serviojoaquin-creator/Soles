import { describe, expect, it } from "vitest";

import { canModerateOwnedContent } from "@/features/album/permissions";
import {
  createCommentSchema,
  photoMetadataSchema,
} from "@/features/album/schemas";

const tripId = "3d11e21d-b10c-4421-af6a-f28d9e67182d";
const photoId = "9bbd7783-175b-4b72-b785-76b318174345";
const activityId = "2592501f-19b7-42bf-a799-04303787c44e";

describe("phase 7 album validation", () => {
  it("accepts optional photo metadata and trims descriptions", () => {
    expect(
      photoMetadataSchema.parse({
        activityId: "",
        description: "  Un atardecer compartido  ",
        tripId,
      }),
    ).toEqual({
      activityId: null,
      description: "Un atardecer compartido",
      tripId,
    });
  });

  it("requires exactly one valid comment target", () => {
    const base = { backTo: "album", body: "Hermosa foto", tripId } as const;
    expect(
      createCommentSchema.safeParse({
        ...base,
        activityId: "",
        photoId,
      }).success,
    ).toBe(true);
    expect(
      createCommentSchema.safeParse({
        ...base,
        activityId,
        photoId,
      }).success,
    ).toBe(false);
    expect(
      createCommentSchema.safeParse({
        ...base,
        activityId: "",
        photoId: "",
      }).success,
    ).toBe(false);
  });

  it("rejects empty or oversized comments", () => {
    expect(
      createCommentSchema.safeParse({
        activityId: activityId,
        backTo: "itinerary",
        body: "   ",
        photoId: "",
        tripId,
      }).success,
    ).toBe(false);
    expect(
      createCommentSchema.safeParse({
        activityId: activityId,
        backTo: "itinerary",
        body: "a".repeat(2001),
        photoId: "",
        tripId,
      }).success,
    ).toBe(false);
  });
});

describe("phase 7 moderation", () => {
  it("allows the author, owner, or admin to moderate", () => {
    expect(canModerateOwnedContent("member", "author", "author")).toBe(true);
    expect(canModerateOwnedContent("owner", "owner", "author")).toBe(true);
    expect(canModerateOwnedContent("admin", "admin", "author")).toBe(true);
    expect(canModerateOwnedContent("member", "other", "author")).toBe(false);
  });
});
