FROM node:22-slim
RUN corepack enable
ARG BUILD_ENVIRONMENT

RUN mkdir -p /frontend/packages/coordnet-hocuspocus

WORKDIR /frontend

COPY ./frontend/packages/coordnet-hocuspocus/package.json ./packages/coordnet-hocuspocus
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

WORKDIR /frontend/packages/coordnet-hocuspocus

COPY ./frontend/packages/coordnet-hocuspocus ./
ENV NODE_ENV=${BUILD_ENVIRONMENT}
RUN pnpm build
CMD ["pnpm", "start"]
