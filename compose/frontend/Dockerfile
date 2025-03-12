FROM node:22-slim
RUN apt-get update && apt-get install -y procps ca-certificates

# Setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

WORKDIR /app

# First copy the package files
COPY ./node/package.json ./node/pnpm-lock.yaml ./node/pnpm-workspace.yaml ./node/.prettierrc ./
WORKDIR /app/frontend
COPY ./node/frontend/package.json ./node/frontend/pnpm-lock.yaml ./
WORKDIR /app/packages/core
COPY ./node/packages/core/package.json ./node/packages/core/pnpm-lock.yaml ./

# Now install dependencies
WORKDIR /app
RUN pnpm install

# Copy the rest of the source code
COPY ./node ./

# Run the server
WORKDIR /app/frontend

ARG SENTRY_AUTH_TOKEN
ARG GIT_REVISION
ARG SENTRY_DSN
ENV VITE_SENTRY_RELEASE=${GIT_REVISION}
ENV SENTRY_RELEASE=${GIT_REVISION}
ENV VITE_SENTRY_DSN=${SENTRY_DSN}

RUN pnpm build
