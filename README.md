# pi-websearch-manager

A small [Pi](https://pi.dev/) extension that keeps Codex `web_run` and extension-provided web-search tools from competing with each other.

It routes by the active tool plan:

- **Codex conversion with active top-level `web_run`**: keep `web_run` and hide web tools from the managed extension providers.
- **Codex conversion in Code or Notebook mode with web search enabled**: keep top-level search tools hidden because Codex exposes nested `web__run` through `exec`.
- **Other runtime plans**: hide top-level `web_run` and enable the tools registered by `pi-web-access` or `@juicesharp/rpiv-web-tools`.

Routing follows the active tool plan selected by `pi-codex-conversion`; it does not duplicate that extension's model, provider-alias, or execution-mode rules.

## Install

```bash
pi install npm:@oleg_tarasov/pi-websearch-manager
```

Recommended package order in `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:@howaboua/pi-codex-conversion",
    "npm:@juicesharp/rpiv-web-tools",
    "npm:@oleg_tarasov/pi-websearch-manager"
  ]
}
```

`npm:pi-web-access` is also supported instead of `npm:@juicesharp/rpiv-web-tools`. Install one extension web provider, not both, because they both register `web_search` by default and Pi keeps the first registration for a given tool name. The manager also performs a deferred reconciliation after `session_start` and `model_select`, so it is resilient to minor load-order differences. Still, loading it after the web-search providers is the clearest setup.

## Prerequisites

Install and configure Codex conversion plus one extension web-search package:

```bash
pi install npm:@howaboua/pi-codex-conversion
pi install npm:@juicesharp/rpiv-web-tools
# or: pi install npm:pi-web-access
```

Enable Codex web search in `pi-codex-conversion`:

```json
{
  "tools": {
    "webRun": true
  }
}
```

You can edit `~/.pi/agent/pi-codex-conversion.json` or use `/codex` in Pi.

Keep Codex conversion scoped to OpenAI/Codex unless you intentionally want it elsewhere:

```json
{
  "scope": {
    "allProviders": "off",
    "additionalProviders": []
  }
}
```

Current `pi-codex-conversion` also supports `"on"` and `"extras"` for `scope.allProviders`. Configured provider aliases and additional Responses providers work without corresponding configuration in this manager: it observes the active Codex tool plan directly.

## Behavior

This extension does not register its own search provider. It only changes the active tool list.

| Active runtime plan | Active search preference | Hidden tools |
| --- | --- | --- |
| Codex conversion with active top-level `web_run` | `web_run` | Managed extension-provider tools |
| Codex Code or Notebook mode with registered `web_run` | Nested `web__run` through `exec` | Top-level `web_run` and managed extension-provider tools |
| Codex plan without web search | Registered extension-provider tools | Top-level `web_run` |
| Other models | Registered extension-provider tools | Top-level `web_run` |

The manager identifies supported tools using Pi's `sourceInfo` provenance rather than generic tool names. This supports current `pi-web-access` defaults (`web_search`, `source_check`, `fetch_content`, `get_search_content`), its configurable public tool names, and `@juicesharp/rpiv-web-tools` (`web_search`, `web_fetch`). Git and local checkouts are recognized when their provenance paths retain the package directory name. Unrelated extensions that happen to use names such as `web_search` are left untouched.

At `session_start` and `model_select`, the selected route is applied and its preferred tools are enabled. Immediately before a turn, the manager removes conflicting tools but does not re-enable a route that the user explicitly disabled with `/tools` after the last model selection. Run `/websearch-manager` to reapply and enable the preferred route on demand.

The status line shows `🔍 web_run` for top-level Codex search and `🔍 web__run` for nested Code/Notebook search. When extension web tools are active, it shows the providing extension package name, such as `🔍 rpiv-web-tools` or `🔍 pi-web-access`; if that cannot be inferred unambiguously, it shows `🔍 ext. search`. No status is shown when neither route has an active tool.

## Command

```text
/websearch-manager
```

Shows the current route and reapplies routing immediately.

## Versioning and release process

This package uses [Semantic Versioning](https://semver.org/).

For each release:

1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Run:
   ```bash
   npm run check
   npm pack --dry-run
   ```
4. Commit the release.
5. Tag it as `vX.Y.Z` and push the commit and tag.
6. Publish:
   ```bash
   npm publish --access public
   ```

## Development

```bash
npm install
npm run check
```

`npm run check` type-checks the extension and runs the routing regression suite against mocked Pi lifecycle and tool-state contracts.

To test locally in Pi without installing from npm:

```bash
pi -e /Users/oleg/Projects/pi-websearch-manager
```
