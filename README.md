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

Replace the values in the `.secrets` file with your own. `OPENAI_API_KEY` is the [OpenAI Key](https://platform.openai.com/api-keys), `SEMANTIC_API_KEY` is the [Semantic Scholar API key](https://www.semanticscholar.org/product/api#api-key-form). Replace `WEBSOCKET_API_KEY` with a secure password specific to your deployment.

### Docker Compose

#### Building

The simplest way to run the project is using Docker Compose. Build the images using:

```sh
docker compose -f compose.yml build
```

#### Running

To run the app for development, use this command:

```sh
docker compose -f compose.yml up --watch
```

## Deployment

### Sentry

To enable Sentry error tracking, set the ENV vars:

```ini
SENTRY_AUTH_TOKEN=__YOUR_AUTH_TOKEN__
SENTRY_DSN=__YOUR_DSN__
```

<!-- ## API

API Documentation information

---

<p align="right">(<a href="#readme-top">back to top</a>)</p>

**Additional Notes:**

- ... -->
