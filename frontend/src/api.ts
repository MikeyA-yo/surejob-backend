/**
 * Client for the SureJob backend REST API.
 * Base URL comes from NEXT_PUBLIC_API_URL (including the /api suffix); defaults to the local backend.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const TOKEN_KEY = "surejob_token";

/** Fired when the API rejects the stored token; AuthContext listens and logs the user out. */
export const LOGGED_OUT_EVENT = "surejob:logged-out";

export type Party = "customer" | "worker";
export type JobStatus = "BOOKED" | "ESCROWED" | "INSURED" | "CONFIRMED" | "PAID_OUT" | "CLAIM_FILED";
export type ClaimReason = "damage" | "injury" | "not_done";
export type AdapterMode = "mock" | "live";

export interface Modes {
  payment: AdapterMode;
  insurance: AdapterMode;
  payout: AdapterMode;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: Party;
  phone: string;
  trade: string | null;
}

export interface WorkerSummary {
  id: string;
  name: string;
  trade: string | null;
}

export interface JobEvent {
  type: string;
  at: string;
  detail: string;
}

export interface Job {
  id: string;
  title: string;
  status: JobStatus;
  amountKobo: number;
  premiumKobo: number | null;
  totalKobo: number;
  quoteId: string | null;
  customer: { id: string; name: string };
  /** onPlatform false: no account; the customer's confirmation releases payout and the customer sees the code. */
  worker: { id: string; name: string; onPlatform: boolean };
  /** Which side of the job the logged-in user is. */
  you: Party;
  confirmations: { customer: boolean; worker: boolean };
  escrowRef: string | null;
  policyRef: string | null;
  claim: { ref: string; status: string; reason: ClaimReason } | null;
  /** code is null unless this user may see it. */
  payout: { code: string | null; expiresAt: string | null; ref: string } | null;
  modes: Modes;
  events: JobEvent[];
}

export interface Quote {
  quoteId: string;
  premiumKobo: number;
  totalKobo: number;
  coverage: string[];
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface NewWorker {
  name: string;
  phone: string;
  trade?: string;
}

export interface CreateJobParams {
  title: string;
  amountKobo: number;
  /** Exactly one of workerId or newWorker. */
  workerId?: string;
  newWorker?: NewWorker;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role: Party;
  phone: string;
  trade?: string;
}

/** An error response from the API (`{ error: { code, message } }`), or a network failure (code NETWORK). */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? null : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("NETWORK", "Can't reach the SureJob server. Check your connection and try again.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event(LOGGED_OUT_EVENT));
    }
    throw new ApiError(data?.error?.code ?? "HTTP_ERROR", data?.error?.message ?? `Request failed (HTTP ${res.status})`, res.status);
  }
  return data as T;
}

// --- auth ----------------------------------------------------------------------

export const login = (email: string, password: string) =>
  request<AuthResult>("/auth/login", { method: "POST", body: { email, password } });

export const register = (params: RegisterParams) => request<AuthResult>("/auth/register", { method: "POST", body: params });

export const getMe = () => request<{ user: User }>("/auth/me").then((r) => r.user);

// --- demo & config -----------------------------------------------------------------

export const getConfig = () => request<{ modes: Modes }>("/config").then((r) => r.modes);

// --- jobs ----------------------------------------------------------------------

export const listWorkers = () => request<{ workers: WorkerSummary[] }>("/workers").then((r) => r.workers);

export const listMyJobs = () => request<{ jobs: Job[] }>("/jobs").then((r) => r.jobs);

export const createJob = (params: CreateJobParams) => request<Job>("/jobs", { method: "POST", body: params });

export const getJob = (jobId: string) => request<Job>(`/jobs/${encodeURIComponent(jobId)}`);

export const getQuote = (jobId: string) => request<Quote>(`/jobs/${encodeURIComponent(jobId)}/quote`, { method: "POST" });

export const payEscrow = (jobId: string, quoteId: string) =>
  request<Job>(`/jobs/${encodeURIComponent(jobId)}/pay`, { method: "POST", body: { quoteId } });

/** Confirms as the logged-in user's side of the job. */
export const confirmJob = (jobId: string) => request<Job>(`/jobs/${encodeURIComponent(jobId)}/confirm`, { method: "POST" });

export const claimJob = (jobId: string, reason: ClaimReason, details: string) =>
  request<Job>(`/jobs/${encodeURIComponent(jobId)}/claim`, { method: "POST", body: { reason, details } });

// --- formatting ------------------------------------------------------------------

export function formatNaira(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}
