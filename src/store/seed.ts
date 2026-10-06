import type { UserRow } from "./store.ts";

/** Fixed ids so the frontend and demo.sh can rely on them across resets. */
export const SEED_CUSTOMER: UserRow = {
  id: "usr_tunde",
  name: "Tunde",
  role: "customer",
  phone: "+2348030000001",
  trade: null,
};

export const SEED_WORKER: UserRow = {
  id: "usr_emeka",
  name: "Emeka",
  role: "worker",
  phone: "+2348030000002",
  trade: "mechanic",
};

export const SEED_JOB = {
  title: "Brake repair",
  amountKobo: 1_500_000, // ₦15,000
} as const;
