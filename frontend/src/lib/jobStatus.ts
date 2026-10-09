import type { Job } from "@/api";

/** Short human labels for the job states. */
export const STATUS_LABELS: Record<Job["status"], string> = {
  BOOKED: "Booked · awaiting payment",
  ESCROWED: "Paid · issuing cover",
  INSURED: "In progress",
  CONFIRMED: "Releasing payout",
  PAID_OUT: "Paid out",
  CLAIM_FILED: "Claim filed · payout held",
};

/** The customer can pay once the worker has accepted the price and no offer is open. */
export function readyToPay(job: Job): boolean {
  return job.status === "BOOKED" && job.priceAgreed && !job.pendingOffer;
}

/** The next screen for this viewer: payment when the customer can pay, otherwise the job screen. */
export function jobHref(job: Job): string {
  return job.you === "customer" && readyToPay(job) ? `/job/${job.id}/pay` : `/job/${job.id}`;
}

/** Price bargaining is possible before payment, with a worker who has an account. */
export function canNegotiate(job: Job): boolean {
  return job.status === "BOOKED" && job.worker.onPlatform;
}
