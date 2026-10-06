export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/** One line per entry: `2026-10-09T10:00:00.000Z INFO transition jobId=job_x from=BOOKED to=ESCROWED`. */
export function createLogger(write: (line: string) => void = (line) => process.stdout.write(line + "\n")): Logger {
  const emit = (level: string, message: string, fields: LogFields = {}) => {
    const pairs = Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${formatValue(v)}`);
    write([new Date().toISOString(), level, message, ...pairs].join(" "));
  };
  return {
    info: (message, fields) => emit("INFO", message, fields),
    warn: (message, fields) => emit("WARN", message, fields),
    error: (message, fields) => emit("ERROR", message, fields),
  };
}

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };

function formatValue(value: string | number | boolean | null | undefined): string {
  const text = String(value);
  return /[\s"=]/.test(text) ? JSON.stringify(text) : text;
}
