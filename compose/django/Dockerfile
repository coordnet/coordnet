# define an alias for the specific python version used in this file.
FROM python:3.11.13-slim-bullseye AS python

# Python build stage
FROM python AS python-build-stage

ARG BUILD_ENVIRONMENT=local

# Install apt packages
RUN apt-get update && apt-get install --no-install-recommends -y \
  # dependencies for building Python packages
  build-essential \
  # psycopg2 dependencies
  libpq-dev
# Requirements are installed here to ensure they will be cached.
COPY ./requirements .

# Create Python Dependency and Sub-Dependency Wheels.
RUN pip wheel --wheel-dir /usr/src/app/wheels  \
  -r ${BUILD_ENVIRONMENT}.txt


# Python 'run' stage
FROM python AS python-run-stage

ARG BUILD_ENVIRONMENT=local
ARG APP_HOME=/app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR ${APP_HOME}

RUN apt-get update && apt-get install --no-install-recommends -y \
  # devcontainer dependencies and utils
  sudo git bash-completion nano ssh gnupg2 wget vim-nox \
  # psycopg2 dependencies and psql client
  libpq-dev \
  postgresql-client \
  # Translations dependencies
  gettext \
  # cleaning up unused files
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
  && rm -rf /var/lib/apt/lists/*

# Create devcontainer user and add it to sudoers
RUN groupadd --gid 1000 dev-user \
  && useradd --uid 1000 --gid dev-user --shell /bin/bash --create-home dev-user \
  && echo dev-user ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/dev-user \
  && chmod 0440 /etc/sudoers.d/dev-user

# Set gpg as git config gpg.program
RUN git config --global gpg.program = /usr/bin/gpg

# Pre-load the tiktoken encodings we need
ENV TIKTOKEN_CL100K_URL="https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken"
ENV TIKTOKEN_O200K_URL="https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken"
ENV TIKTOKEN_CACHE_DIR=/opt/tiktoken_cache
RUN mkdir /opt/tiktoken_cache \
    && wget -O /opt/tiktoken_cache/$(echo -n $TIKTOKEN_CL100K_URL | sha1sum | head -c 40) $TIKTOKEN_CL100K_URL \
    && wget -O /opt/tiktoken_cache/$(echo -n $TIKTOKEN_O200K_URL | sha1sum | head -c 40) $TIKTOKEN_O200K_URL

# All absolute dir copies ignore workdir instruction. All relative dir copies are wrt to the workdir instruction
# copy python dependency wheels from python-build-stage
COPY --from=python-build-stage /usr/src/app/wheels  /wheels/

# use wheels to install python dependencies
RUN pip install --no-cache-dir --no-index --find-links=/wheels/ /wheels/* \
  && rm -rf /wheels/

COPY ./compose/django/entrypoint /entrypoint
RUN sed -i 's/\r$//g' /entrypoint \
  && chmod +x /entrypoint

COPY ./compose/django/start /start
RUN sed -i 's/\r$//g' /start \
  && chmod +x /start

COPY ./compose/django/start-production /start-production
RUN sed -i 's/\r$//g' /start-production
RUN chmod +x /start-production

COPY ./compose/django/celery/worker/start /start-celeryworker
RUN sed -i 's/\r$//g' /start-celeryworker \
  && chmod +x /start-celeryworker

COPY ./compose/django/celery/worker/start-production /start-celeryworker-production
RUN sed -i 's/\r$//g' /start-celeryworker-production
RUN chmod +x /start-celeryworker-production

COPY ./compose/django/celery/beat/start /start-celerybeat
RUN sed -i 's/\r$//g' /start-celerybeat \
  && chmod +x /start-celerybeat

COPY ./compose/django/celery/beat/start-production /start-celerybeat-production
RUN sed -i 's/\r$//g' /start-celerybeat-production
RUN chmod +x /start-celerybeat-production

COPY ./compose/django/celery/flower/start /start-flower
RUN sed -i 's/\r$//g' /start-flower \
  && chmod +x /start-flower

COPY ./compose/django/celery/pubsub-listener/start /start-pubsub-listener
RUN sed -i 's/\r$//g' /start-pubsub-listener \
  && chmod +x /start-pubsub-listener

# copy application code to WORKDIR
COPY . ${APP_HOME}

# Move to the backend directory
WORKDIR ${APP_HOME}/backend

ENTRYPOINT ["/entrypoint"]

FROM node:24-slim AS frontend-stage-for-copy
RUN apt-get update && apt-get install -y procps ca-certificates

# Setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

WORKDIR /app

# First copy the package files
COPY ./node/package.json ./node/pnpm-lock.yaml ./node/pnpm-workspace.yaml ./
WORKDIR /app/frontend
COPY ./node/frontend/package.json ./
WORKDIR /app/packages/core
COPY ./node/packages/core/package.json ./

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

FROM python-run-stage AS python-run-stage-prod
ARG GIT_REVISION
ENV SENTRY_RELEASE=${GIT_REVISION}

COPY --from=frontend-stage-for-copy /app/frontend/dist/static/ /app/backend/coordnet/static/
