import type { UserRecord } from "./types.ts";

/** Demo login for both seed accounts. Demo only: shown on the login screen. */
export const SEED_PASSWORD = "password123";

export type SeedUser = Omit<UserRecord, "passwordHash">;

/** Fixed ids so the frontend and demo.sh can rely on them across resets. */
export const SEED_CUSTOMER: SeedUser = {
  id: "usr_tunde",
  name: "Tunde",
  role: "customer",
  phone: "+2348030000001",
  trade: null,
  email: "tunde@example.com",
};

export const SEED_WORKER: SeedUser = {
  id: "usr_emeka",
  name: "Emeka",
  role: "worker",
  phone: "+2348030000002",
  trade: "mechanic",
  email: "emeka@example.com",
};

export const SEED_JOB = {
  title: "Brake repair",
  amountKobo: 1_500_000, // ₦15,000
} as const;
