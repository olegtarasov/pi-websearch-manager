# pi-websearch-manager

A small [Pi](https://pi.dev/) extension that keeps Codex `web_run` and extension-provided web-search tools from competing with each other.

It routes by the active model:

- **OpenAI Responses / OpenAI Codex models with `web_run` registered**: enable `web_run` from `pi-codex-conversion` and hide managed extension web tools (`web_search`, `code_search`, `fetch_content`, `get_search_content`, `web_fetch`).
- **Other models, or OpenAI models without registered `web_run`**: hide `web_run` and enable all registered managed extension web tools.

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

`npm:pi-web-access` is also supported instead of `npm:@juicesharp/rpiv-web-tools`. The manager also performs a deferred reconciliation after `session_start` and `model_select`, so it is resilient to minor load-order differences. Still, loading it after the web-search providers is the clearest setup.

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
| OpenAI Responses model with registered `web_run` | `web_run` | `web_search`, `code_search`, `fetch_content`, `get_search_content`, `web_fetch` |
| OpenAI Responses model without registered `web_run` | Registered extension web tools | `web_run` |
| Non-OpenAI models | Registered extension web tools | `web_run` |

When routing to extension web tools, the manager enables every managed tool name that an installed extension registered. This supports `pi-web-access` (`web_search`, `code_search`, `fetch_content`, `get_search_content`) and `@juicesharp/rpiv-web-tools` (`web_search`, `web_fetch`). If no supported extension web tools are installed, no replacement tools are enabled.

The status line shows `🔍 web_run` when Codex web search is active. When extension web tools are active, it shows the providing extension package name, such as `🔍 rpiv-web-tools` or `🔍 pi-web-access`; if that cannot be inferred unambiguously, it shows `🔍 ext. search`. No status is shown when neither route has an active tool.

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
