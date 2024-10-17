FROM node:23-slim
RUN corepack enable
ARG BUILD_ENVIRONMENT
ARG GIT_REVISION

RUN mkdir -p /frontend/packages/coordnet-hocuspocus

WORKDIR /frontend

COPY ./frontend/packages/coordnet-hocuspocus/package.json ./packages/coordnet-hocuspocus
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

WORKDIR /frontend/packages/coordnet-hocuspocus

COPY ./frontend/packages/coordnet-hocuspocus ./
ENV NODE_ENV=${BUILD_ENVIRONMENT}
ENV SENTRY_RELEASE=${GIT_REVISION}

RUN pnpm build
CMD ["pnpm", "start"]
