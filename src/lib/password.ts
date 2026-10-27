import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const run = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** "s1$<salt hex>$<hash hex>" — scrypt with a per-user random salt. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await run(password, salt, 64);
  return `s1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [v, salt, hash] = stored.split("$");
  if (v !== "s1" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await run(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Slows down failed sign-in attempts. */
export const failDelay = () => new Promise((r) => setTimeout(r, 700));
