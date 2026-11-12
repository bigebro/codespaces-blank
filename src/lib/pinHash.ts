import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PREFIX = "scrypt1$";

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${PREFIX}${salt}$${hash}`;
}

export function pinMatches(stored: string | null | undefined, pin: string): boolean {
  if (!stored || !/^\d{4}$/.test(pin)) return false;
  if (!stored.startsWith(PREFIX)) return stored === pin;
  const [, salt, expected] = stored.split("$");
  if (!salt || !expected) return false;
  const actual = scryptSync(pin, salt, 32);
  const expectedBuf = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

export function isHashedPin(stored: string | null | undefined): boolean {
  return Boolean(stored && stored.startsWith(PREFIX));
}
