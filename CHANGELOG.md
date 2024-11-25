# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Support for object storage (MinIO and S3) for storing uploads.

### Fixed

- Bug in node repository search accessing old spaces list.

### Removed

- Removed ability of Nodes to be in multiple Spaces at once.
- Removed object-level permissions for Nodes.

## [24.11.3] - 2024-11-15

### Removed

- Removed the timeout in the OpenAI client for running canvases, resetting it to the default value.

### Changed

- Upgraded from Django 5.0.x to 5.1.3. This should mainly affect the minimum required Python and
  PostgreSQL versions for us.
- Replaces the hasher for unittests with a slightly slower one, because the previous one was removed
  in Django 5.1.0.
- Use the new `pglocks` feature to create advisory locks with a transaction scope instead of a
  session scope. This should prevent some potential deadlocks when using pgbouncer.

## [24.11.2] - 2024-11-05

### Added

- Allow Django's `X_FRAME_OPTIONS` settings to be set with the `DJANGO_X_FRAME_OPTIONS` env var.

### Fixed

- Allow OpenAI responses to contain empty chunks, which can happen on Azure endpoints. Also make
  streaming responses error handling a bit more robust in general.

## [24.11.1] - 2024-11-01

### Fixed

- Fixed a bug where the Azure OpenAI Endpoint variable was not being read correctly.

## [24.11.0] - 2024-11-01

### Added

- Support for Azure OpenAI endpoints, which will be favoured when both OpenAI and Azure are
  configured.
- Packaging of releases using GitHub Actions.

### Fixed

- Re-enabled logging of HTTP requests in production deployments

## [24.10.0] - 2024-10-30

Initial release of the Coordination.network project as built docker image.

[24.11.3]: https://github.com/coordnet/coordnet/compare/v24.11.2...v24.11.3
[24.11.2]: https://github.com/coordnet/coordnet/compare/v24.11.1...v24.11.2
[24.11.1]: https://github.com/coordnet/coordnet/compare/v24.11.0...v24.11.1
[24.11.0]: https://github.com/coordnet/coordnet/compare/v24.10.0...v24.11.0
[24.10.0]: https://github.com/coordnet/coordnet/releases/tag/v24.10.0
