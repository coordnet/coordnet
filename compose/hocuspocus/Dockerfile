FROM node:20-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=development

WORKDIR /app

RUN mkdir -p /app/packages/coordnet-hocuspocus

COPY ./frontend/packages/coordnet-hocuspocus/package.json ./packages/coordnet-hocuspocus/
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

WORKDIR /app/packages/coordnet-hocuspocus/

RUN pnpm install --frozen-lockfile

COPY ./frontend/packages/coordnet-hocuspocus .

CMD ["pnpm", "run", "dev"]
