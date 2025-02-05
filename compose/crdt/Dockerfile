FROM node:22-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# This is required to install @sentry/profiling-node
RUN apt-get update && apt-get install --no-install-recommends -y \
  python3 build-essential \
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app

COPY ./crdt/package.json ./crdt/pnpm-lock.yaml .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY ./crdt .

RUN pnpm build

CMD ["pnpm", "start"]
