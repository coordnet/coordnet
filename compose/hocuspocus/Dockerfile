FROM node:20-slim
RUN corepack enable
ENV NODE_ENV=development

RUN mkdir -p /frontend/packages/coordnet-hocuspocus

WORKDIR /frontend

COPY ./frontend/packages/coordnet-hocuspocus/package.json ./packages/coordnet-hocuspocus
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

WORKDIR /frontend/packages/coordnet-hocuspocus

COPY ./frontend/packages/coordnet-hocuspocus ./

CMD ["pnpm", "run", "dev"]
