// Checks the ECOBANK_* credentials in .env by fetching a real sandbox token.
//   npm run ecobank:token [serviceCode]
// Prints the token's lifetime and a short prefix, never the full token.
import { ecobankConfig, parseEnv } from "../src/config.ts";
import { EcobankTokenProvider } from "../src/adapters/ecobank/tokenProvider.ts";
import { createLogger } from "../src/logger.ts";

const config = ecobankConfig(parseEnv());
if ("missing" in config) {
  console.error(`Missing in .env: ${config.missing.join(", ")}`);
  process.exit(1);
}

const serviceCode = process.argv[2] ?? config.paymentServiceCode;
const tokens = new EcobankTokenProvider({ config, serviceCode, logger: createLogger() });

try {
  const started = performance.now();
  const token = await tokens.getToken();
  const fetchMs = Math.round(performance.now() - started);
  const again = await tokens.getToken();

  console.log(`\n✓ token for ${serviceCode} from ${config.baseUrl} in ${fetchMs}ms`);
  console.log(`  prefix: ${token.slice(0, 16)}…  (${token.length} chars)`);
  console.log(`  second call served from cache: ${again === token ? "yes" : "no"}`);
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
