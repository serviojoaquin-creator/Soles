import { z } from "zod";

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string) {
  if (!calendarDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidIanaTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("es-AR", { timeZone: value }).format();
    return value.includes("/") || value === "UTC";
  } catch {
    return false;
  }
}

const calendarDateSchema = z
  .string()
  .trim()
  .refine(isCalendarDate, "Ingresá una fecha válida.");

export const tripSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(4000),
    destination: z.string().trim().min(1).max(160),
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
    defaultTimezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(isValidIanaTimezone, "Ingresá una zona horaria IANA válida."),
  })
  .refine((values) => values.endDate >= values.startDate, {
    path: ["endDate"],
    message: "La fecha de regreso no puede ser anterior a la salida.",
  });

export const tripIdSchema = z.string().uuid();

export const archiveTripSchema = z.object({
  tripId: tripIdSchema,
  archived: z.enum(["true", "false"]),
});

export const lifecycleTripSchema = z.object({
  confirm: z.literal("yes"),
  tripId: tripIdSchema,
});

export function tripFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
