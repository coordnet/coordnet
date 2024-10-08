<a id="readme-top"></a>

<div align="center">
  <a href="https://github.com/coordnet/coordnet">
    <img src="frontend/app/public/static/coordination-network-circle.png" alt="Coordination Network" width="175" height="175">
  </a>

<h3 align="center">Coordination Network</h3>
  <p align="center">
    An open source platform to scale your know how. A network to seamlessly share methods, opportunities and discoveries. This is the monorepo containing back and front-end code to run the APIs and interface.
  </p>
</div>

## Development

### Pre-commit

Make sure `pre-commit` is [installed](https://pre-commit.com#install).

Install standard and `commit-msg` pre-commit hooks.

```bash
pre-commit install
pre-commit install --hook-type commit-msg
```

### Environment

```sh
cp .envs/.local/.secrets.example .envs/.local/.secrets
```

Replace the values in the `.secrets` file with your own. `OPENAI_API_KEY` is the
[OpenAI Key](https://platform.openai.com/api-keys), `SEMANTIC_API_KEY` is the
[Semantic Scholar API key](https://www.semanticscholar.org/product/api#api-key-form).
Replace `WEBSOCKET_API_KEY` with a secure password specific to your deployment.

### Docker Compose

#### Building

The simplest way to run the project is using Docker Compose. Build the images using:

```sh
docker compose build
```

#### Running

To run the app for development, use this command:

```sh
docker compose up --watch
```

## Deployment

The project is currently deployed as docker containers to fly.io. The corresponding `fly.*.toml`
files are in the root of the project.
In theory the project can be deployed to any docker compatible environment, however the process
isn't tested or documented yet.

## Settings

Settings are managed using [django-environ](https://django-environ.readthedocs.io/en/latest/),
which means that most of them can be set using environment variables. The settings are defined in
the `config/settings/*.py` files. Please note that all settings files inherit from `base.py`.

### Required settings

In addition to the keys mentioned in the [Environment](#environment) section, the following settings
are required:

- PostgreSQL database settings: When not using the docker compose file, these must be either set by
  using the `DATABASE_URL` environment variable or by setting the individual settings
  (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`).
- Message queue settings: The project uses Celery for asynchronous tasks. When not using docker
  compose the message broker settings must be set using the `CELERY_BROKER_URL` environment
  variable or the default `REDIS_URL` setting is being used. See the
  [celery docs](https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-broker_url)
  for more information.

- When using production settings, the `SECRET_KEY` must be set and the `CORS_ALLOWED_ORIGINS`,
  `CSRF_TRUSTED_ORIGINS` and `DJANGO_ALLOWED_HOSTS` need to be changed to the correct domain.
- To send emails, `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` must be set in production mode
  (development mode is using mailpit to intercept emails and display them in a local webinterface).

### (Common) optional settings

To enable Sentry error tracking, set `SENTRY_AUTH_TOKEN` and `SENTRY_DSN`.

## API

The API is documented using OpenAPI. The documentation is available in `docs/redoc-static.html` or
[here](https://htmlpreview.github.io/?https://github.com/coordnet/coordnet/blob/main/docs/redoc-static.html).
