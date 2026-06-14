# pi-websearch-manager

A small [Pi](https://pi.dev/) extension that keeps web-search tools from `pi-codex-conversion` and `pi-web-access` from competing with each other.

It routes by the active model:

- **OpenAI Responses / OpenAI Codex models with `web_run` registered**: enable `web_run` from `pi-codex-conversion` and hide all managed `pi-web-access` tools (`web_search`, `code_search`, `fetch_content`, `get_search_content`).
- **Other models, or OpenAI models without registered `web_run`**: hide `web_run` and enable all registered `pi-web-access` tools.

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

| Active model | Active search preference | Hidden tools |
| --- | --- | --- |
| OpenAI Responses model with registered `web_run` | `web_run` | `web_search`, `code_search`, `fetch_content`, `get_search_content` |
| OpenAI Responses model without registered `web_run` | Registered `pi-web-access` tools | `web_run` |
| Non-OpenAI models | Registered `pi-web-access` tools | `web_run` |

When routing to `pi-web-access`, the extension enables every managed tool that the installed `pi-web-access` extension registered. If `pi-web-access` is not installed, no replacement tools are enabled.

The status line shows `🔍 web_run` when Codex web search is active, `🔍 pwa` when `pi-web-access` tools are active, and no status when neither route has an active tool.

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
