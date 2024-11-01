# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

[24.11.1]: https://github.com/coordnet/coordnet/compare/v24.11.0...v24.11.1
[24.11.0]: https://github.com/coordnet/coordnet/compare/v24.10.0...v24.11.0
[24.10.0]: https://github.com/coordnet/coordnet/releases/tag/v24.10.0
