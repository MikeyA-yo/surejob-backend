/**
 * Centralized API client for SureJob backend REST endpoints.
 * Base URL defaults to http://localhost:8080/api.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface JobEvent {
  type: string;
  at: string;
  detail: string;
}

export interface JobCustomer {
  id: string;
  name: string;
}

export interface JobWorker {
  id: string;
  name: string;
}

export interface JobPayout {
  code?: string;
  expiresAt?: string;
  ref?: string;
}

export interface JobClaim {
  ref?: string;
  status?: string;
  reason?: string;
}

export interface Job {
  id: string;
  title: string;
  status: "BOOKED" | "INSURED" | "CONFIRMED" | "PAID_OUT" | "CLAIM_FILED";
  amountKobo: number;
  premiumKobo: number | null;
  totalKobo: number;
  quoteId: string | null;
  customer: JobCustomer;
  worker: JobWorker;
  confirmations: {
    customer: boolean;
    worker: boolean;
  };
  escrowRef: string | null;
  policyRef: string | null;
  claim: JobClaim | null;
  payout: JobPayout | null;
  events: JobEvent[];
}

export interface QuoteResponse {
  quoteId: string;
  premiumKobo: number;
  totalKobo: number;
  coverage?: string[];
}

export interface CreateJobParams {
  customerId?: string;
  workerId?: string;
  title?: string;
  amountKobo?: number;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

/**
 * Create Job: POST /jobs
 * Body: { customerId: "tunde1", workerId: "emeka1", title: "Brake repair", amountKobo: 1500000 }
 * Gracefully maps default IDs if backend was seeded with usr_tunde / usr_emeka.
 */
export async function createJob(params?: CreateJobParams): Promise<Job> {
  const customerId = params?.customerId || "tunde1";
  const workerId = params?.workerId || "emeka1";
  const title = params?.title || "Brake repair";
  const amountKobo = params?.amountKobo ?? 1500000;

  try {
    return await request<Job>("/jobs", {
      method: "POST",
      body: JSON.stringify({ customerId, workerId, title, amountKobo }),
    });
  } catch (err) {
    // If backend seeded with usr_tunde / usr_emeka, retry with those ids
    if (customerId === "tunde1" || workerId === "emeka1") {
      try {
        return await request<Job>("/jobs", {
          method: "POST",
          body: JSON.stringify({
            customerId: "usr_tunde",
            workerId: "usr_emeka",
            title,
            amountKobo,
          }),
        });
      } catch (innerErr) {
        console.error("Failed to create job with fallback IDs:", innerErr);
        throw innerErr;
      }
    }
    throw err;
  }
}

/**
 * Get Quote: POST /jobs/:id/quote (No body required) -> Returns { quoteId, premiumKobo, totalKobo }
 */
export async function getQuote(jobId: string): Promise<QuoteResponse> {
  return request<QuoteResponse>(`/jobs/${jobId}/quote`, {
    method: "POST",
  });
}

/**
 * Pay Escrow: POST /jobs/:id/pay (Body: { quoteId })
 */
export async function payEscrow(jobId: string, data: { quoteId: string }): Promise<Job> {
  return request<Job>(`/jobs/${jobId}/pay`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Get Status: GET /jobs/:id -> Returns full Job object, including the events array
 */
export async function getJob(jobId: string): Promise<Job> {
  return request<Job>(`/jobs/${jobId}`);
}

/**
 * Confirm: POST /jobs/:id/confirm (Body: { party: "customer" | "worker" }) -> Second confirmation returns payout.code
 */
export async function confirmJob(jobId: string, data: { party: "customer" | "worker" }): Promise<Job> {
  return request<Job>(`/jobs/${jobId}/confirm`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Claim: POST /jobs/:id/claim (Body: { filedBy: "customer", reason: "damage", details: "string" })
 */
export async function claimJob(
  jobId: string,
  data: {
    filedBy: "customer" | "worker";
    reason: "damage" | "injury" | "not_done";
    details?: string;
  }
): Promise<Job> {
  return request<Job>(`/jobs/${jobId}/claim`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
