import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import { settings } from "./settings";

Sentry.init({
  dsn: settings.SENTRY_DSN,
  environment: settings.SENTRY_ENVIRONMENT,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: settings.SENTRY_TRACES_SAMPLE_RATE,
  profilesSampleRate: settings.SENTRY_PROFILES_SAMPLE_RATE,
});
