#!/usr/bin/env bash
# SureJob happy-path walkthrough against a running API.
#
#   scripts/demo.sh          book → quote → pay → confirm ×2 → prints the payout code
#   scripts/demo.sh claim    book → quote → pay → file a claim
#
# Env: BASE_URL (default http://127.0.0.1:8080). Needs curl and node (no jq).
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
SCENARIO="${1:-happy}"
CUSTOMER_ID="usr_tunde"
WORKER_ID="usr_emeka"

if [[ "$SCENARIO" != "happy" && "$SCENARIO" != "claim" ]]; then
  echo "usage: $0 [happy|claim]" >&2
  exit 2
fi

# fields <json> <path>... — prints the value at each dotted path ("payout.code"), one per line.
# A "₦" prefix formats a kobo amount as naira. One node process per response keeps this fast.
fields() {
  node -e '
    const [raw, ...paths] = process.argv.slice(1);
    const doc = JSON.parse(raw);
    for (const spec of paths) {
      const naira = spec.startsWith("₦");
      let v = doc;
      for (const k of spec.replace(/^₦/, "").split(".")) v = v == null ? undefined : v[k];
      if (naira) v = "₦" + (Number(v) / 100).toLocaleString("en-NG");
      console.log(v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
    }
  ' "$@"
}

# api <METHOD> <PATH> [JSON_BODY] — prints the response body; exits on a non-2xx status.
api() {
  local method="$1" path="$2" body="${3:-}" response status
  if [[ -n "$body" ]]; then
    response=$(curl -sS -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -d "$body" -w $'\n%{http_code}')
  else
    response=$(curl -sS -X "$method" "$BASE_URL$path" -w $'\n%{http_code}')
  fi
  status="${response##*$'\n'}"
  response="${response%$'\n'*}"
  if [[ "$status" != 2* ]]; then
    echo "✗ $method $path → HTTP $status" >&2
    echo "  $response" >&2
    exit 1
  fi
  printf '%s' "$response"
}

expect() {
  if [[ "$2" != "$1" ]]; then
    echo "✗ expected status $1, got $2" >&2
    exit 1
  fi
}

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# --- wait for the API ---------------------------------------------------------
for _ in $(seq 1 40); do
  curl -sf "$BASE_URL/healthz" >/dev/null 2>&1 && break
  sleep 0.25
done
curl -sf "$BASE_URL/healthz" >/dev/null || { echo "✗ API not reachable at $BASE_URL" >&2; exit 1; }

step "0. Adapter modes"
mapfile -t f < <(fields "$(api GET /api/config)" modes.payment modes.insurance modes.payout)
echo "   payment=${f[0]}  insurance=${f[1]}  payout=${f[2]}"

step "1. Book a job"
job=$(api POST /api/jobs "{\"customerId\":\"$CUSTOMER_ID\",\"workerId\":\"$WORKER_ID\",\"title\":\"Brake repair\",\"amountKobo\":1500000}")
mapfile -t f < <(fields "$job" status id title ₦amountKobo)
expect BOOKED "${f[0]}"
JOB_ID="${f[1]}"
echo "   $JOB_ID  ${f[2]}  ${f[3]}  [BOOKED]"

step "2. Get a cover quote"
mapfile -t f < <(fields "$(api POST "/api/jobs/$JOB_ID/quote")" quoteId ₦premiumKobo ₦totalKobo coverage)
QUOTE_ID="${f[0]}"
echo "   $QUOTE_ID  premium ${f[1]}  total ${f[2]}"
node -e 'for (const line of JSON.parse(process.argv[1])) console.log("   • " + line)' "${f[3]}"

step "3. Pay into escrow (collect, then issue policy)"
mapfile -t f < <(fields "$(api POST "/api/jobs/$JOB_ID/pay" "{\"quoteId\":\"$QUOTE_ID\"}")" status escrowRef policyRef)
expect INSURED "${f[0]}"
echo "   escrow ${f[1]}  policy ${f[2]}  [INSURED]"

if [[ "$SCENARIO" == "claim" ]]; then
  step "4. Customer files a claim"
  job=$(api POST "/api/jobs/$JOB_ID/claim" '{"filedBy":"customer","reason":"damage","details":"Scratched alloy wheel during the brake repair"}')
  mapfile -t f < <(fields "$job" status claim.ref claim.status)
  expect CLAIM_FILED "${f[0]}"
  echo "   claim ${f[1]}  status ${f[2]}  [CLAIM_FILED, payout held]"
else
  step "4. Customer confirms"
  mapfile -t f < <(fields "$(api POST "/api/jobs/$JOB_ID/confirm" '{"party":"customer"}')" status)
  expect INSURED "${f[0]}"
  echo "   waiting for the worker  [INSURED]"

  step "5. Worker confirms → payout"
  mapfile -t f < <(fields "$(api POST "/api/jobs/$JOB_ID/confirm" '{"party":"worker"}')" status payout.ref)
  expect PAID_OUT "${f[0]}"
  PAYOUT_REF="${f[1]}"
  echo "   [PAID_OUT]"

  step "6. Confirming again is a no-op"
  mapfile -t f < <(fields "$(api POST "/api/jobs/$JOB_ID/confirm" '{"party":"worker"}')" payout.ref)
  if [[ "${f[0]}" != "$PAYOUT_REF" ]]; then
    echo "✗ a second payout was issued" >&2
    exit 1
  fi
  echo "   same payout ref $PAYOUT_REF"
fi

step "Timeline"
node -e '
  const job = JSON.parse(process.argv[1]);
  for (const e of job.events) console.log(`   ${e.at.slice(11, 19)}  ${e.type.padEnd(24)} ${e.detail}`);
  const m = job.modes;
  console.log(`   modes used: payment=${m.payment} insurance=${m.insurance} payout=${m.payout}\n`);
  if (job.payout) console.log(`\x1b[1;32mPAYOUT CODE: ${job.payout.code}\x1b[0m  (ref ${job.payout.ref}, expires ${job.payout.expiresAt})`);
  if (job.claim) console.log(`\x1b[1;32mCLAIM FILED: ${job.claim.ref}\x1b[0m  (${job.claim.reason}, ${job.claim.status})`);
' "$(api GET "/api/jobs/$JOB_ID")"
