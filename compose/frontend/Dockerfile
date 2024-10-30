FROM node:23-slim

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

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY ./frontend .

ARG SENTRY_AUTH_TOKEN
ARG GIT_REVISION
ARG SENTRY_DSN
ENV VITE_SENTRY_RELEASE=${GIT_REVISION}
ENV SENTRY_RELEASE=${GIT_REVISION}
ENV VITE_SENTRY_DSN=${SENTRY_DSN}

RUN pnpm build

CMD ["pnpm", "run", "dev", "--host"]
