FROM node:20 as node-build-stage

WORKDIR /app

RUN npm install -g pnpm

COPY ./frontend/packages/coordnet-hocuspocus/package*.json ./
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

RUN pnpm install

COPY ./frontend/packages/coordnet-hocuspocus/ .

FROM node:20-slim as node-run-stage

RUN npm install -g pnpm

WORKDIR /app

COPY --from=node-build-stage /app .

CMD ["pnpm", "run", "dev"]
