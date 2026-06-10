import pino from "pino";

const redactPaths = ["req.headers.authorization", "req.headers.cookie", "apiKey", "token", "password", "secret"];

export function createLogger(level = "info"): pino.Logger {
  return pino({
    level,
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]"
    }
  });
}
