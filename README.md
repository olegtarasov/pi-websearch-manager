# pi-websearch-manager

A small [Pi](https://pi.dev/) extension that keeps web-search tools from `pi-codex-conversion` and `pi-web-access` from competing with each other.

It routes by the active model:

- **OpenAI Responses / OpenAI Codex models**: prefer `web_run` from `pi-codex-conversion` and hide duplicate `pi-web-access` search tools (`web_search`, `code_search`).
- **Other models**: hide `web_run` and restore the previously active `pi-web-access` search tools.

`fetch_content` and `get_search_content` stay available on OpenAI models because they provide URL, GitHub, PDF, YouTube, and video extraction that is broader than ordinary web search.

## Install

```bash
pi install npm:@oleg_tarasov/pi-websearch-manager
```

Recommended package order in `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:@howaboua/pi-codex-conversion",
    "npm:pi-web-access",
    "npm:@oleg_tarasov/pi-websearch-manager"
  ]
}
```

The manager also performs a deferred reconciliation after `session_start` and `model_select`, so it is resilient to minor load-order differences. Still, loading it after both web-search providers is the clearest setup.

## Prerequisites

Install and configure both upstream packages:

```bash
pi install npm:@howaboua/pi-codex-conversion
pi install npm:pi-web-access
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
    "allProviders": false,
    "additionalProviders": []
  }
}
```

If you use OpenAI via the regular `openai` provider instead of `openai-codex`, configure `pi-codex-conversion` so `web_run` is supported for that provider, for example by adding `"openai"` to `scope.additionalProviders` when appropriate.

## Behavior

This extension does not register its own search provider. It only changes the active tool list.

| Active model | Active search preference | Hidden duplicate tools |
| --- | --- | --- |
| `openai-codex/*` Responses models | `web_run` | `web_search`, `code_search` |
| `openai/*` Responses models | `web_run` if provided by `pi-codex-conversion` | `web_search`, `code_search` |
| Non-OpenAI models | `web_search`, `code_search` from `pi-web-access` | `web_run` |

The extension remembers which `pi-web-access` search tools were active before hiding them, then restores only those tools when you switch away from OpenAI. It does not force-enable tools that were not previously active.

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

To test locally in Pi without installing from npm:

```bash
pi -e /Users/oleg/Projects/pi-websearch-manager
```
