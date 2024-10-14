FROM node:22-slim

ARG VITE_CRDT_URL
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_WS_URL
ARG SENTRY_AUTH_TOKEN
ARG BUILD_ENVIRONMENT
ARG GIT_REVISION
ARG SENTRY_DSN
ENV VITE_CRDT_URL=${VITE_CRDT_URL}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_BACKEND_WS_URL=${VITE_BACKEND_WS_URL}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV VITE_SENTRY_RELEASE=${GIT_REVISION}
ENV SENTRY_RELEASE=${GIT_REVISION}
ENV VITE_SENTRY_DSN=${SENTRY_DSN}

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install --no-install-recommends -y \
  ca-certificates \
  python3 \
  build-essential \
  pkg-config \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app

COPY ./frontend/package.json ./frontend/pnpm-lock.yaml .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY ./frontend .

RUN pnpm build

CMD ["pnpm", "run", "dev", "--host"]
