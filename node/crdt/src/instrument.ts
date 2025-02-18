import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import { settings } from "./settings";

if (settings.SENTRY_DSN) {
  Sentry.init({
    dsn: settings.SENTRY_DSN,
    environment: settings.SENTRY_ENVIRONMENT,
    integrations: [nodeProfilingIntegration(), Sentry.postgresIntegration()],
    tracesSampleRate: settings.SENTRY_TRACES_SAMPLE_RATE,
    profilesSampleRate: settings.SENTRY_PROFILES_SAMPLE_RATE,
  });
}
