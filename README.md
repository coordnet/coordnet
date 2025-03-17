<a id="readme-top"></a>

<!-- [![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Apache License 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0) -->

<div align="center">
  <a href="https://github.com/coordnet/coordnet">
    <img src="frontend/public/static/coordination-network-circle.png" alt="Coordination Network" width="175" height="175">
  </a>

  <h3 align="center">Coordination Network</h3>
  <p align="center">
    An open source platform to scale your know how. A network to seamlessly share methods, opportunities and discoveries. This is the monorepo containing back and front-end code to run the APIs and interface.
  </p>
</div>

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Local Development](#local-development)
- [Initial Configuration](#initial-configuration)
  - [Account Creation](#account-creation)
  - [Email Verification](#email-verification)
  - [Superuser Setup](#superuser-setup)
  - [Space Creation](#space-creation)
- [Development Tools](#development-tools)
  - [Pre-commit Hooks](#pre-commit-hooks)
  - [Docker Commands](#docker-commands)
- [Configuration](#configuration)
  - [Required Settings](#required-settings)
  - [Optional Settings](#optional-settings)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

Coordination Network is an open-source platform designed to help organizations and communities scale their knowledge sharing and coordination efforts. The platform provides tools for sharing methods, opportunities, and discoveries across your network.

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Git
- Pre-commit (for development)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/coordnet/coordnet.git
cd coordnet
```

2. Copy the environment file:
```bash
cp .envs/.local/.secrets.example .envs/.local/.secrets
```

3. Configure your environment variables in `.envs/.local/.secrets` and `.envs/.local/.django.secrets`:
   - `OPENAI_API_KEY`: Obtain from [OpenAI Platform](https://platform.openai.com/api-keys)
   - `SEMANTIC_API_KEY`: Get from [Semantic Scholar](https://www.semanticscholar.org/product/api#api-key-form)
   - `WEBSOCKET_API_KEY`: Set a secure password for your deployment
   - For the `JWT_SIGNING_KEY` and `JWT_VERIFYING_KEY`, generate a keypair and save them as a one-line string. To create the keypair using openssl, run:
     ```bash
     openssl genrsa -out private-key.pem 4096
     openssl rsa -in private-key.pem -pubout -out public-key.pem
     ```

### Local Development

1. Build the Docker images:
```bash
docker compose build
```

2. Start the application:
```bash
docker compose up --watch
```

3. Access the application:
   - Frontend: http://localhost:5173
   - Backend Admin: http://localhost:8000/admin
   - Email Interface (Mailpit): http://localhost:8025

## Initial Configuration

### Account Creation
1. Once the application is running, navigate to http://localhost:5173/auth/signup
2. Fill in your details:
   - Name
   - Email address
   - Password

### Email Verification
1. The system will send a verification email
2. Since you're running locally, emails are sent to Mailpit
3. Access Mailpit at http://localhost:8025
4. Find your verification email and copy the verification code
5. Enter the code in the verification page to complete your account setup

### Superuser Setup
1. Open a terminal and get a shell to the Django container:
```bash
docker compose run --rm django bash
```

2. Create a superuser account:
```bash
python manage.py createsuperuser
```

3. Follow the prompts to set:
   - Email address
   - Password

### Space Creation
1. Log in to the Django Admin (http://localhost:8000/admin) using your superuser credentials
2. Navigate to "Spaces" and click "+ Add"
3. Configure your space:
   - Enter a title
   - Under "Object Memberships", assign users and their roles
4. Click "Save" to create the space
5. Access your space at http://localhost:5173

## Development Tools

### Pre-commit Hooks
1. Install pre-commit:
```bash
pip install pre-commit
```

2. Set up the hooks:
```bash
pre-commit install
pre-commit install --hook-type commit-msg
```

### Docker Commands
- Build containers: `docker compose build`
- Start services: `docker compose up --watch`
- Stop services: `docker compose down`
- Access Django shell: `docker compose run --rm django bash`

## Configuration

### Required Settings
When not using Docker Compose, configure the following:

- Database Settings (either set `DATABASE_URL` or individual settings):
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_HOST`
  - `POSTGRES_PORT`

- Message Queue Settings:
  - `CELERY_BROKER_URL` or default `REDIS_URL`

- Production Settings:
  - `SECRET_KEY`
  - `CORS_ALLOWED_ORIGINS`
  - `CSRF_TRUSTED_ORIGINS`
  - `DJANGO_ALLOWED_HOSTS`

- Email Settings (Production):
  - `MAILGUN_API_KEY`
  - `MAILGUN_DOMAIN`

### Optional Settings
- Sentry Error Tracking:
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_DSN`

## Deployment

The project is currently deployed using Docker containers on fly.io. Configuration files (`fly.*.toml`) are available in the project root. While the project can theoretically be deployed to any Docker-compatible environment, the process is currently only documented for fly.io.

## API Documentation

The API is documented using OpenAPI. Access the documentation:
- Local: `docs/redoc-static.html`
- Online: [API Documentation](https://htmlpreview.github.io/?https://github.com/coordnet/coordnet/blob/main/docs/redoc-static.html)

## Contributing

1. Check the [repo issues](https://github.com/coordnet/coordnet/issues) for contribution ideas
2. Read the [contributing documentation](CONTRIBUTING.md) for detailed guidelines
3. Submit your contributions through pull requests

Any contribution intentionally submitted for inclusion in this repository, shall be dual licensed as below, without any additional terms or conditions.

## License

Licensed under either of:

- [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0) ([LICENSE-APACHE](LICENSE-APACHE))
- [MIT License](http://opensource.org/licenses/MIT) ([LICENSE-MIT](LICENSE-MIT))
