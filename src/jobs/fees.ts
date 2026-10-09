/** How SureJob's service fee is charged on top of the job price and the insurance premium. */
export interface FeePolicy {
  /** Percentage of the job price, e.g. 2.5. */
  percent: number;
  /** Floor, in kobo. */
  minKobo: number;
}

const KOBO_PER_NAIRA = 100;

/** percent × job price, rounded up to the next whole naira, at least minKobo. */
export function serviceFeeKobo(amountKobo: number, policy: FeePolicy): number {
  const raw = Math.ceil((amountKobo * policy.percent) / 100 / KOBO_PER_NAIRA) * KOBO_PER_NAIRA;
  return Math.max(raw, policy.minKobo);
}
