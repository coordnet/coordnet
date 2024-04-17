FROM node:20-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ENV NODE_ENV=development

WORKDIR /frontend

RUN mkdir -p /frontend/app

COPY ./frontend/app/package.json ./app
COPY ./frontend/pnpm-lock.yaml ./
COPY ./frontend/pnpm-workspace.yaml ./

WORKDIR /frontend/app

RUN pnpm install --frozen-lockfile

COPY ./frontend/app .

CMD ["pnpm", "run", "dev", "--host"]
