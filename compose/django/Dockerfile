ARG FRONTEND_IMAGE=coordnet_local_frontend

# define an alias for the specific python version used in this file.
FROM python:3.11.11-slim-bullseye AS python

# Python build stage
FROM python AS python-build-stage

ARG BUILD_ENVIRONMENT=local

# Standardize cache directories across stages
ENV PIP_CACHE_DIR=/root/.cache/pip
ENV APT_CACHE_DIR=/var/cache/apt

# Install apt packages and clean up in the same layer
RUN --mount=type=cache,target=APT_CACHE_DIR \
  apt-get update && apt-get install --no-install-recommends -y \
  # dependencies for building Python packages
  build-essential \
  # psycopg2 dependencies
  libpq-dev \
  # Clean up apt cache
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

# Requirements are installed here to ensure they will be cached.
COPY ./requirements .

# Create Python Dependency and Sub-Dependency Wheels and clean up pip cache
RUN pip wheel --wheel-dir /usr/src/app/wheels \
  --cache-dir PIP_CACHE_DIR \
  -r /usr/src/app/${BUILD_ENVIRONMENT}.txt \
  && rm -rf ${PIP_CACHE_DIR}/*


# Python 'run' stage
FROM python AS python-run-stage

ARG BUILD_ENVIRONMENT=local
ARG APP_HOME=/app

ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

WORKDIR ${APP_HOME}

# Install packages and clean up in the same layer
RUN --mount=type=cache,target=APT_CACHE_DIR \
  apt-get update && apt-get install --no-install-recommends -y \
  # devcontainer dependencies and utils
  sudo git bash-completion nano ssh gnupg2 wget vim-nox \
  # psycopg2 dependencies and psql client
  libpq-dev \
  postgresql-client \
  # Translations dependencies
  gettext \
  # cleaning up unused files
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

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

# use wheels to install python dependencies and clean up
RUN --mount=type=cache,target=PIP_CACHE_DIR \
  pip install --no-cache-dir --no-index --find-links=/wheels/ /wheels/* \
  && rm -rf /wheels/ \
  && rm -rf ${PIP_CACHE_DIR}/* \
  && find /usr/local/lib/python3.11/site-packages -name "*.pyc" -delete \
  && find /usr/local/lib/python3.11/site-packages -name "__pycache__" -delete

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

FROM ${FRONTEND_IMAGE} AS frontend-stage-for-copy

FROM python-run-stage AS python-run-stage-prod
ARG GIT_REVISION
ENV SENTRY_RELEASE ${GIT_REVISION}

COPY --from=frontend-stage-for-copy /app/dist/static/ /app/backend/coordnet/static/
