FROM node:20-slim
RUN corepack enable
ENV NODE_ENV=development

WORKDIR /app

COPY ./frontend/packages/coordnet-hocuspocus/package.json ./
COPY ./frontend/packages/coordnet-hocuspocus/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY ./frontend/packages/coordnet-hocuspocus .

CMD ["pnpm", "run", "dev"]
