# Contributing to Coordination.network

## Development Workflow

### Branch Structure

We use a structured branch naming convention to keep our repository organized:

```
(bug|feature)/<issue_id>-<branch_name>
```

**Examples:**

- `feature/123-add-user-authentication`
- `bug/456-fix-memory-leak`
- `feature/789-implement-real-time-sync`

### Git Flow Principles

We follow GitHub Flow principles for our development process:

> "Ideally, each commit contains an isolated, complete change. This makes it easy to revert your changes if you decide to take a different approach."
>
> — [GitHub Flow Documentation](https://docs.github.com/en/get-started/using-github/github-flow)

**Key principles:**

- Keep commits atomic and focused on a single change
- Write clear, descriptive commit messages following Conventional Commits
- Create feature branches from `main` for new work
- Open pull requests early for discussion and feedback
- Merge back to `main` when ready

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification commit messages.

### Type

Must be one of the following:

- **build**: Related to the build process (e.g. pre-commit, npm, pip)
- **ci**: CI configuration (e.g. GitHub Actions)
- **docs**: Documentation
- **feat**: Adding a feature
- **fix**: Fixing a bug
- **perf**: Improvements to performance
- **refactor**: Changes that restructure code but do not change the function
- **test**: Related to tests

### Scope

Scopes should be used to add further detail to area of the project that is being committed to. The following is the list of supported scopes:

- **auth**
- **buddies**
- **db**
- **deployment**
- **editor**
- **canvas**
- **llm**
- **nodes**
- **permissions**
- **search**
- **skills**
- **ui**
- **web3**
- **crdt**
- **profiles**
