import "dotenv/config";

import { bool, cleanEnv, EnvError, makeValidator, num, str } from "envalid";

const strMinThirtyChars = makeValidator<string>((input: string) => {
  if (typeof input !== "string") {
    throw new EnvError("Input must be a string");
  }
  if (input.length < 30) {
    throw new EnvError("String must be at least 30 characters long");
  }
  return input;
});

export const settings = cleanEnv(process.env, {
  HOCUSPOCUS_PORT: num({ default: 8010 }),
  HOCUSPOCUS_TIMEOUT: num({ default: 30000 }),
  HOCUSPOCUS_DEBOUNCE: num({ default: 2000 }),
  HOCUSPOCUS_MAXDEBOUNCE: num({ default: 10000 }),
  HOCUSPOCUS_QUIET: bool({ default: false }),
  POSTGRES_HOST: str(),
  POSTGRES_PORT: num({ default: 5432 }),
  POSTGRES_DB: str(),
  POSTGRES_USER: str(),
  POSTGRES_PASSWORD: str(),
  BACKEND_URL: str(),
  WEBSOCKET_API_KEY: strMinThirtyChars(),
  SENTRY_DSN: str({ default: "" }),
  SENTRY_ENVIRONMENT: str({ default: "production" }),
  SENTRY_TRACES_SAMPLE_RATE: num({ default: 1.0 }),
  SENTRY_PROFILES_SAMPLE_RATE: num({ default: 1.0 }),
});

export const hocuspocusSettings = {
  port: settings.HOCUSPOCUS_PORT,
  timeout: settings.HOCUSPOCUS_TIMEOUT,
  debounce: settings.HOCUSPOCUS_DEBOUNCE,
  maxDebounce: settings.HOCUSPOCUS_MAXDEBOUNCE,
  quiet: settings.HOCUSPOCUS_QUIET,
};
