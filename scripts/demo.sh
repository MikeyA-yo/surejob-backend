#!/usr/bin/env bash
# SureJob walkthrough against a running API, logged in as the demo accounts.
#
#   scripts/demo.sh             Tunde books Emeka → quote → pay → both confirm → Emeka sees the payout code
#   scripts/demo.sh claim       book → quote → pay → Tunde files a claim
#   scripts/demo.sh offplatform Tunde books Musa, who is not on SureJob → pay → Tunde's confirmation pays out
#
# Env: BASE_URL (default http://127.0.0.1:8080). Needs curl and node (no jq).
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
SCENARIO="${1:-happy}"
DEMO_PASSWORD="password123"

case "$SCENARIO" in
  happy | claim | offplatform) ;;
  *) echo "usage: $0 [happy|claim|offplatform]" >&2; exit 2 ;;
esac

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

# api <TOKEN|-> <METHOD> <PATH> [JSON_BODY] — prints the response body; exits on a non-2xx status.
api() {
  local token="$1" method="$2" path="$3" body="${4:-}" response status
  local args=(-sS -X "$method" "$BASE_URL$path" -w $'\n%{http_code}')
  [[ "$token" != "-" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body" ]] && args+=(-H 'Content-Type: application/json' -d "$body")
  response=$(curl "${args[@]}")
  status="${response##*$'\n'}"
  response="${response%$'\n'*}"
  if [[ "$status" != 2* ]]; then
    echo "✗ $method $path → HTTP $status" >&2
    echo "  $response" >&2
    exit 1
  fi
  printf '%s' "$response"
}

login() {
  fields "$(api - POST /api/auth/login "{\"email\":\"$1\",\"password\":\"$DEMO_PASSWORD\"}")" token
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

step "0. Adapter modes, and log in"
mapfile -t f < <(fields "$(api - GET /api/config)" modes.payment modes.insurance modes.payout)
echo "   payment=${f[0]}  insurance=${f[1]}  payout=${f[2]}"
TUNDE=$(login tunde@example.com)
echo "   logged in as Tunde (customer)"
if [[ "$SCENARIO" != "offplatform" ]]; then
  EMEKA=$(login emeka@example.com)
  echo "   logged in as Emeka (worker)"
fi

step "1. Tunde books a job"
if [[ "$SCENARIO" == "offplatform" ]]; then
  booking='{"title":"Leaking kitchen pipe","amountKobo":800000,"newWorker":{"name":"Musa","phone":"+2348031112222","trade":"plumber"}}'
else
  booking='{"workerId":"usr_emeka","title":"Brake repair","amountKobo":1500000}'
fi
mapfile -t f < <(fields "$(api "$TUNDE" POST /api/jobs "$booking")" status id title ₦amountKobo worker.name worker.onPlatform)
expect BOOKED "${f[0]}"
JOB_ID="${f[1]}"
echo "   $JOB_ID  ${f[2]}  ${f[3]}  worker ${f[4]} (on SureJob: ${f[5]})  [BOOKED]"

step "2. Get a cover quote"
mapfile -t f < <(fields "$(api "$TUNDE" POST "/api/jobs/$JOB_ID/quote")" quoteId ₦premiumKobo ₦totalKobo coverage)
QUOTE_ID="${f[0]}"
echo "   $QUOTE_ID  premium ${f[1]}  total ${f[2]}"
node -e 'for (const line of JSON.parse(process.argv[1])) console.log("   • " + line)' "${f[3]}"

step "3. Pay into escrow (collect, then issue policy)"
mapfile -t f < <(fields "$(api "$TUNDE" POST "/api/jobs/$JOB_ID/pay" "{\"quoteId\":\"$QUOTE_ID\"}")" status escrowRef policyRef)
expect INSURED "${f[0]}"
echo "   escrow ${f[1]}  policy ${f[2]}  [INSURED]"

VIEWER="$TUNDE"
case "$SCENARIO" in
  claim)
    step "4. Tunde files a claim"
    job=$(api "$TUNDE" POST "/api/jobs/$JOB_ID/claim" '{"reason":"damage","details":"Scratched alloy wheel during the brake repair"}')
    mapfile -t f < <(fields "$job" status claim.ref claim.status)
    expect CLAIM_FILED "${f[0]}"
    echo "   claim ${f[1]}  status ${f[2]}  [CLAIM_FILED, payout held]"
    ;;
  offplatform)
    step "4. Tunde confirms; Musa has no account, so this releases the payout"
    mapfile -t f < <(fields "$(api "$TUNDE" POST "/api/jobs/$JOB_ID/confirm")" status)
    expect PAID_OUT "${f[0]}"
    echo "   [PAID_OUT]  Tunde passes the code to Musa"
    ;;
  happy)
    step "4. Tunde confirms"
    mapfile -t f < <(fields "$(api "$TUNDE" POST "/api/jobs/$JOB_ID/confirm")" status)
    expect INSURED "${f[0]}"
    echo "   waiting for the worker  [INSURED]"

    step "5. Emeka confirms → payout"
    mapfile -t f < <(fields "$(api "$EMEKA" POST "/api/jobs/$JOB_ID/confirm")" status payout.ref)
    expect PAID_OUT "${f[0]}"
    PAYOUT_REF="${f[1]}"
    echo "   [PAID_OUT]"

    step "6. Confirming again is a no-op"
    mapfile -t f < <(fields "$(api "$EMEKA" POST "/api/jobs/$JOB_ID/confirm")" payout.ref)
    if [[ "${f[0]}" != "$PAYOUT_REF" ]]; then
      echo "✗ a second payout was issued" >&2
      exit 1
    fi
    echo "   same payout ref $PAYOUT_REF"
    VIEWER="$EMEKA" # only the worker sees the code
    ;;
esac

step "Timeline"
node -e '
  const job = JSON.parse(process.argv[1]);
  for (const e of job.events) console.log(`   ${e.at.slice(11, 19)}  ${e.type.padEnd(24)} ${e.detail}`);
  const m = job.modes;
  console.log(`   modes used: payment=${m.payment} insurance=${m.insurance} payout=${m.payout}\n`);
  if (job.payout) {
    const code = job.payout.code ?? "not returned by provider";
    console.log(`\x1b[1;32mPAYOUT CODE: ${code}\x1b[0m  (ref ${job.payout.ref}, expires ${job.payout.expiresAt ?? "unknown"}, seen by the ${job.you})`);
  }
  if (job.claim) console.log(`\x1b[1;32mCLAIM FILED: ${job.claim.ref}\x1b[0m  (${job.claim.reason}, ${job.claim.status})`);
' "$(api "$VIEWER" GET "/api/jobs/$JOB_ID")"
