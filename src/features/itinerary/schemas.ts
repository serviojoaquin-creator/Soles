import { z } from "zod";

import { isCalendarDate, isValidIanaTimezone } from "@/features/trips/schemas";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalTime = z
  .string()
  .trim()
  .refine((value) => value === "" || timePattern.test(value), {
    message: "Ingresá un horario válido.",
  });

export const activitySchema = z
  .object({
    tripId: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(4000),
    activityDate: z
      .string()
      .trim()
      .refine(isCalendarDate, "Ingresá una fecha válida."),
    startTime: optionalTime,
    endTime: optionalTime,
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(isValidIanaTimezone, "Ingresá una zona horaria IANA válida."),
    locationName: z.string().trim().max(240),
    confirmOutsideRange: z.enum(["", "yes"]),
  })
  .superRefine((values, context) => {
    if (values.endTime && !values.startTime) {
      context.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "La hora de inicio es obligatoria si indicás una hora final.",
      });
    }

    if (
      values.startTime &&
      values.endTime &&
      values.endTime <= values.startTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "La hora final debe ser posterior a la inicial.",
      });
    }
  });

export const updateActivitySchema = activitySchema.and(
  z.object({ activityId: z.string().uuid() }),
);

export const activityStatusSchema = z.object({
  tripId: z.string().uuid(),
  activityId: z.string().uuid(),
  status: z.enum(["planned", "done", "cancelled"]),
});

export const deleteActivitySchema = z.object({
  tripId: z.string().uuid(),
  activityId: z.string().uuid(),
  confirm: z.literal("yes"),
});

export const reorderActivitySchema = z.object({
  tripId: z.string().uuid(),
  activityId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export function itineraryFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function isActivityOutsideTrip(
  activityDate: string,
  tripStartDate: string,
  tripEndDate: string,
) {
  return activityDate < tripStartDate || activityDate > tripEndDate;
}
