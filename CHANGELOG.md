# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-09-11

### Added

- Support the standalone `@howaboua/pi-codex-web-run` package introduced by current `pi-codex-conversion` releases, including its top-level `web_run` provenance and nested `web__run` Code/Notebook integration.
- Add round-trip model-switch regressions for on-premises models, direct Codex models, configured provider aliases, structured mode, Code mode, missing Codex search, and legacy bundled `web_run`.

### Changed

- Distinguish the standalone Codex search capability from the active Codex adapter plan, because standalone `web_run` can remain registered while chatting with unrelated providers.
- Detect current structured Codex plans from conversion-owned `exec_command` and `write_stdin` tools, while retaining `exec` detection for Code and Notebook modes.
- Remove timer-based deferred activation and require the documented manager-last package order, matching Pi's sequential lifecycle handler contract without risking a delayed override of `/tools` choices.
- Require Pi 0.84.4 or newer and validate development against Pi 0.85.1, `pi-codex-conversion` 3.0.33, `pi-codex-web-run` 0.0.2, `@juicesharp/rpiv-web-tools` 2.9.0, and `pi-web-access` 0.29.0.
- Update installation and configuration documentation for the split Codex packages and remove the obsolete `tools.webRun` setting.

### Fixed

- Switch from extension-provider search to Codex search when moving from an on-premises model to current Codex Code, Notebook, or structured modes.
- Stop treating an always-registered standalone `web_run` as proof that a non-Codex model should use the Codex route.
- Clear the manager status during session shutdown.

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
