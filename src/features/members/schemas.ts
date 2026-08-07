import { z } from "zod";

const uuidSchema = z.string().uuid();
const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Ingresá un email válido.",
  });

export const createInviteSchema = z.object({
  tripId: uuidSchema,
  role: z.enum(["admin", "member"]),
  invitedEmail: optionalEmailSchema,
  expiresInDays: z.enum(["1", "3", "7", "14", "30"]),
  maxUses: z.coerce.number().int().min(1).max(25),
});

export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const revokeInviteSchema = z.object({
  tripId: uuidSchema,
  inviteId: uuidSchema,
});

export const updateMemberRoleSchema = z.object({
  tripId: uuidSchema,
  userId: uuidSchema,
  role: z.enum(["admin", "member"]),
});

export const removeMemberSchema = z.object({
  tripId: uuidSchema,
  userId: uuidSchema,
  confirm: z.literal("yes"),
});

export const leaveTripSchema = z.object({ tripId: uuidSchema });

export const transferOwnershipSchema = z.object({
  tripId: uuidSchema,
  newOwnerId: uuidSchema,
  previousOwnerRole: z.enum(["admin", "member"]),
  confirm: z.literal("yes"),
});

export function memberFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
