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

/** The next screen for this viewer: pay for a booked job, otherwise the status screen. */
export function jobHref(job: Job): string {
  return job.status === "BOOKED" && job.you === "customer" ? `/job/${job.id}/pay` : `/job/${job.id}`;
}
