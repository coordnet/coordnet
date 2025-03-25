import "dotenv/config";

import { bool, cleanEnv, num, str } from "envalid";

export const settings = cleanEnv(process.env, {
  HOCUSPOCUS_PORT: num({ default: 8010 }),
  HOCUSPOCUS_TIMEOUT: num({ default: 300000 }),
  HOCUSPOCUS_DEBOUNCE: num({ default: 2000 }),
  HOCUSPOCUS_MAXDEBOUNCE: num({ default: 10000 }),
  HOCUSPOCUS_QUIET: bool({ default: false }),
  DATABASE_URL: str(),
  BACKEND_URL: str(),
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
