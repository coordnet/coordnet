FROM node:22-slim
RUN corepack enable
ENV NODE_ENV=development

RUN mkdir -p /frontend/app

WORKDIR /frontend

COPY ./frontend/app/package.json ./app
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

WORKDIR /frontend/app

COPY ./frontend/app .

CMD ["pnpm", "run", "dev", "--host"]
