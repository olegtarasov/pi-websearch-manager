# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.0.3] - 2026-06-14

### Fixed

- Route OpenAI Responses models to `web_run` only when `web_run` is registered.
- Enable all registered managed `pi-web-access` tools when `web_run` is unavailable or the active model is not an OpenAI Responses model.

## [0.0.2] - 2026-06-14

### Changed

- Hide `fetch_content` and `get_search_content` alongside `web_search` and `code_search` when routing OpenAI Responses models to `web_run`.
- Restore only the previously active managed `pi-web-access` tools when switching away from OpenAI models.

## [0.0.1] - 2026-06-14

### Added

- Initial Pi extension package.
- Model-aware routing between `pi-codex-conversion` `web_run` and `pi-web-access` `web_search` / `code_search`.
- `/websearch-manager` command to show and reapply routing.
- README and agent instructions.
