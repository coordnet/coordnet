FROM node:20-slim
RUN corepack enable
ENV NODE_ENV=development

WORKDIR /app

COPY ./frontend/app/package.json ./
COPY ./frontend/app/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY ./frontend/app .

CMD ["pnpm", "run", "dev", "--host"]
