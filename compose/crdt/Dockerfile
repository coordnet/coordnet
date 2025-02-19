FROM node:22-slim
RUN apt-get update && apt-get install -y procps

# Setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

WORKDIR /app

# First copy the package files
COPY ./node/package.json ./node/pnpm-lock.yaml ./node/pnpm-workspace.yaml ./
WORKDIR /app/crdt
COPY ./node/crdt/package.json ./node/crdt/pnpm-lock.yaml ./
WORKDIR /app/packages/core
COPY ./node/packages/core/package.json ./node/packages/core/pnpm-lock.yaml ./

# Now install dependencies
WORKDIR /app
RUN pnpm install

# Copy the rest of the source code
COPY ./node ./

# Run the server
WORKDIR /app/crdt
CMD ["pnpm", "start:server"]
