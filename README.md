# SureJob backend (POC)

Owns the job lifecycle (book → quote → escrow → insure → confirm → payout, or claim) and talks to
Ecobank and Curacel only through adapters. Everything runs offline on mocks; each integration flips
to its live sandbox with one env var. See `SureJob_PRD_Backend.pdf` for the full brief.

Stack: Node 24 running TypeScript directly (no build step), Express 5, zod for request validation.
Storage is MongoDB when `MONGO_URI` is set (Render, whose disk is wiped on deploy), otherwise the
built-in `node:sqlite` file at `DB_PATH` (offline demo laptop, tests). Both sit behind one `Store`
interface; a job is stored with its events and claim so every transition is one atomic,
status-conditional write.

## Run

```sh
npm install
npm run dev          # watch mode, http://127.0.0.1:8080
npm start            # same without watch
npm run demo         # in another terminal: book → quote → pay → confirm ×2 → payout code
npm run demo:claim   # book → quote → pay → claim
npm test             # API + unit tests on an in-memory DB
                     # (set MONGO_TEST_URI to also run the store tests against MongoDB)
npm run typecheck
npm run ecobank:token  # check the ECOBANK_* credentials by fetching a sandbox token
```

**API docs:** Swagger UI at http://127.0.0.1:8080/docs, raw OpenAPI 3.1 spec at `/openapi.json`.
Both are generated from the same zod schemas the API validates with, and work offline.

Config comes from env (or `.env`, see `.env.example`). Rehearse fast with `MOCK_LATENCY_MS=0`, and
practise recovery with `MOCK_FAIL=pay` (the next collect fails once; `POST /api/demo/reset` re-arms it).

The database is seeded whenever it starts empty: customer **Tunde** (`usr_tunde`), worker
**Emeka** (`usr_emeka`, mechanic), and a "Brake repair" job for ₦15,000.

## Deploy (Render)

Web Service with build command `npm ci`, start command `npm start`, health check `/healthz`.
Env: `HOST=0.0.0.0` (required; the default 127.0.0.1 is unreachable), `NODE_VERSION=24`,
`MONGO_URI` (so data survives deploys), `CORS_ORIGINS=<frontend URL>`. Render sets `PORT`.

## API

| Endpoint | Body | Returns |
| --- | --- | --- |
| `GET /api/config` | — | `{ modes }` |
| `POST /api/demo/reset` | — | `{ jobId }` (wipes everything, restores the seed) |
| `POST /api/jobs` | `customerId, workerId, title, amountKobo` | Job (`BOOKED`), 201 |
| `GET /api/jobs/:id` | — | Job |
| `POST /api/jobs/:id/quote` | — | `{ quoteId, premiumKobo, totalKobo, coverage[] }` |
| `POST /api/jobs/:id/pay` | `quoteId` | Job (`INSURED`), safe to retry |
| `POST /api/jobs/:id/confirm` | `party: "customer" \| "worker"` | Job (`PAID_OUT` after the second) |
| `POST /api/jobs/:id/claim` | `filedBy: party, reason: damage \| injury \| not_done, details?` | Job with `claim` |

Job shape is in `src/jobs/view.ts`. It follows the contract, plus `quoteId` so a reloaded page can
still pay. `premiumKobo` is `null` until quoted. `payout.code` and `payout.expiresAt` are always set
in mock mode but may be `null` with live XpressCash, whose documented response has neither. Errors are always `{ error: { code, message } }`:

| Status | Codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON` |
| 404 | `NOT_FOUND` |
| 409 | `INVALID_TRANSITION`, `QUOTE_REQUIRED`, `QUOTE_MISMATCH` |
| 502 | `ADAPTER_ERROR` (provider call failed; the job stays where it was, so retry the same request) |

No auth in the POC. Do not describe it as secure.

## Layout

```
src/main.ts            wiring, env, server start
src/config.ts          env parsing and validation
src/httpapi/           routes, request schemas, error format, CORS
src/jobs/              state machine, service (lifecycle logic), response shape
src/store/             Store interface; MongoStore and SqliteStore; seed
src/adapters/          payment/ insurance/ payout/: interface + mock + live each
scripts/demo.sh        curl walkthrough (the Friday smoke test)
```

## Live adapters

Each adapter folder has the interface (`payment.ts`, `insurance.ts`, `payout.ts`), the mock, and a
live class. Rules for live classes: return exactly the interface's shape, read keys from env only,
throw on any provider failure (the service logs it, records a `*.failed` timeline event and returns
502), and never fall back to the mock.

| Adapter | Live class | State |
| --- | --- | --- |
| Payment | `payment/ecobank.ts` | Stub: waiting on the escrow-collection endpoint |
| Insurance | `insurance/curacel.ts` | Stub: waiting on Curacel Grow |
| Payout | `payout/xpresscash.ts` | Implemented against `/corp-token/api/v2/integration/token/generate`; UAT sample account cannot complete a token yet |

Shared Ecobank plumbing lives in `src/adapters/ecobank/`: access tokens (cached, refreshed before
expiry, one in-flight request per service), request signing (SHA-512 `requestToken`/`secureHash`
from `ECOBANK_SECRET_KEY`, or fixed sandbox values), and an authenticated client that retries once
on 401. See `.env.example` for the `ECOBANK_*` settings.
