FROM node:22-slim
RUN corepack enable
ENV NODE_ENV=development

RUN apt-get update && apt-get install --no-install-recommends -y \
  ca-certificates \
  python3 \
  build-essential \
  pkg-config \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /frontend/app

WORKDIR /frontend

COPY ./frontend/app/package.json ./app
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile  --strict-peer-dependencies

WORKDIR /frontend/app

COPY ./frontend/app .

CMD ["pnpm", "run", "dev", "--host"]
