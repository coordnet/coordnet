import "dotenv/config";

import { bool, cleanEnv, num, str } from "envalid";

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
});

export const hocuspocusSettings = {
  port: settings.HOCUSPOCUS_PORT,
  timeout: settings.HOCUSPOCUS_TIMEOUT,
  debounce: settings.HOCUSPOCUS_DEBOUNCE,
  maxDebounce: settings.HOCUSPOCUS_MAXDEBOUNCE,
  quiet: settings.HOCUSPOCUS_QUIET,
};
