# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-08-18

### Added

- Add routing regression coverage for current Pi lifecycle behavior, Codex normal/Code/Notebook plans, provider aliases, renamed `pi-web-access` tools, manual tool disabling, and unrelated tool-name collisions.
- Show `🔍 web__run` when Codex web search is nested inside Code or Notebook mode.

### Changed

- Follow the active runtime plan selected by `pi-codex-conversion` instead of duplicating OpenAI provider and API detection.
- Discover managed extension tools through Pi `sourceInfo` provenance, including configurable `pi-web-access` tool names and Git/local checkout paths.
- Preserve explicit `/tools` disabling during the pre-turn conflict guard while continuing to enable the preferred route on session/model changes and `/websearch-manager`.
- Require Pi 0.84.2 or newer and validate development against the current Pi and TypeScript versions.
- Update documentation for current Codex execution modes, `pi-web-access`, provider collisions, and routing behavior.

### Fixed

- Hide the current `pi-web-access` `source_check` tool when Codex web search owns the route.
- Stop reactivating top-level `web_run` when Codex Code or Notebook mode intentionally exposes nested `web__run` instead.
- Leave unrelated packages' tools untouched when they reuse generic names such as `web_search`.
- Avoid false provider matches for similarly named local or Git checkout directories.
- Stop advertising nested `web__run` if Codex `exec` was manually disabled while Notebook remains active.

## [0.1.0] - 2026-06-14

### Added

- Support `@juicesharp/rpiv-web-tools` by managing its `web_search` and `web_fetch` tools like the existing extension web-search tools.

### Changed

- Generalize non-Codex routing to extension-provided web tools instead of treating `pi-web-access` as the only managed provider.
- Show `🔍 <extension_name>` for extension web-search mode when the provider can be inferred, falling back to `🔍 ext. search` when it cannot.

## [0.0.4] - 2026-06-14

### Changed

- Shorten the status line to `🔍 web_run` for Codex web search and `🔍 pwa` for `pi-web-access`.
- Clear the status line when no managed web-search tools are active.

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
