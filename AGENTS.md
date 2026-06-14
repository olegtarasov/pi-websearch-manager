# Agent instructions for pi-websearch-manager

## Project purpose

This repository contains a Pi extension package that routes active web-search tools between:

- `pi-codex-conversion` / `web_run` for OpenAI Responses and OpenAI Codex models.
- Extension-provided web tools from `pi-web-access` or `@juicesharp/rpiv-web-tools` for non-OpenAI models.

Do not add a new web-search implementation here unless explicitly requested. This package should stay a lightweight active-tool router.

## Development workflow

- Read `README.md`, `CHANGELOG.md`, and `src/index.ts` before changing behavior.
- Keep the package publishable as a Pi package via the `pi.extensions` manifest in `package.json`.
- Run `npm run check` before considering work complete.
- Run `npm pack --dry-run` before release or packaging changes.
- Keep documentation in sync with behavior changes.

## Versioning

Use Semantic Versioning:

- Patch: bug fixes and documentation-only behavior clarifications.
- Minor: backward-compatible routing/configuration features.
- Major: breaking behavior, defaults, package name, or public command changes.

For a release, update both `package.json` and `CHANGELOG.md`, commit, tag `vX.Y.Z`, and push the commit and tag.

## Completion rule

When a task is complete, always commit and push the work. If the task is release-related, also push the version tag. If publishing to npm is requested but local npm authentication is missing, clearly tell the user the exact manual command to run after `npm login`.
