import { createHash, randomBytes } from "node:crypto";

const inviteTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function generateInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInviteToken(value: string) {
  return inviteTokenPattern.test(value);
}
