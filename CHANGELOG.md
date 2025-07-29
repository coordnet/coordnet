# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Upgraded Tiptap and Hocuspocus from v2 to v3.

### Added

- Ability for Skills to write to Spaces (using External Nodes).
- Add API support for creating and managing PaperQA collections.
- Add support for FutureHouse Platform API.

### Fixed

- Improve admin performance by not loading all objects for FK dropdowns.

## [25.5.2] - 2025-05-19

### Fixed

- Fix calling of OpenAI client after refactor.
- Overflow of text input for skill runner.
- Buddy dropdown overflow and model names for skill nodes and skill runner.

## [25.5.1] - 2025-05-19

### Added

- Support Azure Blob Storage as object storage backend.
- Available LLMs can now be configured in the backend.

## [25.5.0] - 2025-05-05

### Added

- Support for object storage (MinIO and S3) for storing uploads.
- Use cached session storage in production deployments.
- Add User and Space profile pages.
- Add method node type to backend and API.
- Add method runs to backend and API.
- Add method node versioning.
- Add UI for skills.
- Add dashboard as default landing page after login.
- Upgrade to @xyflow/react.
- Add connection line for displaying and creating multi‑edge connections.
- Kubernetes configuration and documentation, GitHub action for testing.
- Backend execution of methods/skills.
- Add o1 and o3 models to allowed models.
- Add node context endpoint, which returns the LLM context for a given node.
- Support JWT authentication for the API and using it for other services.
- Buddies can be set per skill prompt node.
- Add endpoint to convert various file types into markdown using Microsoft's markitdown library.
- Skill Runner page.

### Fixed

- Bug in node repository search accessing old spaces list.
- Filter choices in interactive API for Nodes showed unfiltered choices.
- Fix a N+1 query in the spaces list view.
- Allow users with non-public profiles to create methods.
- Removed o1 non-streaming logic as streaming is now possible.

### Removed

- Removed ability of Nodes to be in multiple Spaces at once.
- Removed object-level permissions for Nodes.
- Removed unused `title_slug` from the Space model.

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

[25.5.2]: https://github.com/coordnet/coordnet/compare/v25.5.1...v25.5.2
[25.5.1]: https://github.com/coordnet/coordnet/compare/v25.5.0...v25.5.1
[25.5.0]: https://github.com/coordnet/coordnet/compare/v24.11.3...v25.5.0
[24.11.3]: https://github.com/coordnet/coordnet/compare/v24.11.2...v24.11.3
[24.11.2]: https://github.com/coordnet/coordnet/compare/v24.11.1...v24.11.2
[24.11.1]: https://github.com/coordnet/coordnet/compare/v24.11.0...v24.11.1
[24.11.0]: https://github.com/coordnet/coordnet/compare/v24.10.0...v24.11.0
[24.10.0]: https://github.com/coordnet/coordnet/releases/tag/v24.10.0
