# pi-websearch-manager

A small [Pi](https://pi.dev/) extension that keeps Codex `web_run` and extension-provided web-search tools from competing with each other.

It routes the recognized search capabilities for the current runtime:

- **Codex structured mode**: enable top-level `web_run` and hide managed extension-provider tools.
- **Codex Code or Notebook mode**: hide all managed top-level search tools because `@howaboua/pi-codex-web-run` exposes `web__run` through `exec`.
- **Other models**: hide top-level `web_run` and enable the tools from `pi-web-access` or `@juicesharp/rpiv-web-tools`.
- **No registered `web_run`**: keep extension-provider search available, including on Codex models.

This package does not implement web search. It only manages Pi's active tool list.

## Install

Install the Codex adapter, its standalone web-search package, one extension web provider, and this manager:

```bash
pi install npm:@howaboua/pi-codex-conversion
pi install npm:@howaboua/pi-codex-web-run
pi install npm:@juicesharp/rpiv-web-tools
# or, instead of rpiv-web-tools:
# pi install npm:pi-web-access
pi install npm:@oleg_tarasov/pi-websearch-manager
```

> `pi-codex-conversion` 3.0.24 removed its bundled web search. Current installations need the separate `@howaboua/pi-codex-web-run` package for `web_run`.

Recommended package order in `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:@howaboua/pi-codex-conversion",
    "npm:@howaboua/pi-codex-web-run",
    "npm:@juicesharp/rpiv-web-tools",
    "npm:@oleg_tarasov/pi-websearch-manager"
  ]
}
```

Use `npm:pi-web-access` instead of `npm:@juicesharp/rpiv-web-tools` if preferred. Do not install both extension web providers unless you intentionally manage their name collision: both register `web_search` by default, and Pi keeps the first registration for a tool name.

Load the manager after the providers. Pi runs lifecycle handlers sequentially in extension order, so manager-last lets it reconcile the final tool plan without timing-based callbacks.

## Prerequisites and configuration

This release supports Pi 0.84.4 and newer and is validated against Pi 0.85.1, `pi-codex-conversion` 3.0.33, `pi-codex-web-run` 0.0.2, `@juicesharp/rpiv-web-tools` 2.9.0, and `pi-web-access` 0.29.0.

Authenticate the standalone Codex search route:

```text
/login openai-codex
```

Compatible active Codex transports can use their own credentials. For renamed or proxied Responses providers, keep `pi-codex-conversion`'s `scope.additionalProviders` aligned with the routes in `~/.pi/agent/pi-codex-tools.json`; the active conversion plan is the manager's routing signal for those aliases.

Configure the extension provider separately:

- Run `/web-tools` for `@juicesharp/rpiv-web-tools`.
- Configure `~/.pi/agent/web-search.json` for `pi-web-access` when its defaults are not sufficient.

Keep Codex conversion scoped to Codex and explicitly configured providers unless broader adapter activation is intentional:

```json
{
  "scope": {
    "allProviders": "off",
    "additionalProviders": []
  }
}
```

Use `/codex` to select normal, Code, or Notebook execution mode. `pi-codex-web-run` integrates with Code and Notebook mode through the conversion extension's bridge.

## Routing behavior

| Recognized runtime | Preferred search | Hidden tools |
| --- | --- | --- |
| Direct Codex model or active structured Codex adapter plan, with registered `web_run` | `web_run` | Managed extension-provider tools |
| Active Codex Code/Notebook plan, with registered `web_run` | Nested `web__run` through `exec` | Top-level `web_run` and managed extension-provider tools |
| Any runtime without registered `web_run` | Registered extension-provider tools | None |
| Other models | Registered extension-provider tools | Top-level `web_run` |

The manager recognizes direct Codex models from the current provider/API and configured provider aliases from active, conversion-owned structured or Code-mode tools. An active standalone `web_run` alone is deliberately not treated as a Codex-plan signal because the standalone package can execute while chatting with unrelated providers. Legacy conversion-owned `web_run` remains supported for pre-split installations.

Supported tools are identified using Pi's canonical `sourceInfo` provenance:

- `@howaboua/pi-codex-web-run`: `web_run`
- legacy `@howaboua/pi-codex-conversion`: `web_run`
- `@juicesharp/rpiv-web-tools`: `web_search`, `web_fetch`
- `pi-web-access`: its registered tools, including configurable public names for `web_search`, `source_check`, `fetch_content`, and `get_search_content`

npm, Git, and local checkouts are recognized when their provenance retains the exact package directory name. Unrelated extensions that reuse generic names such as `web_search` or `web_run` are left untouched.

At `session_start` and `model_select`, the preferred route is enabled. Immediately before a turn, conflicts are removed without re-enabling preferred tools that the user disabled through `/tools`. Run `/websearch-manager` to reapply the preferred route explicitly.

The status line shows:

- `🔍 web_run` for top-level Codex search
- `🔍 web__run` for nested Code/Notebook search
- `🔍 rpiv-web-tools` or `🔍 pi-web-access` for a recognized extension provider
- `🔍 ext. search` when multiple managed extension providers are active and no single label is unambiguous

No status is shown when the selected route has no active search tool.

## Command

```text
/websearch-manager
```

Shows the recognized runtime route and reapplies it immediately.

## Development

```bash
npm install
npm run check
npm pack --dry-run
```

`npm run check` type-checks the extension and runs lifecycle, provenance, model-switch, Code/Notebook, provider-alias, and manual-tool-selection regressions.

To test a local checkout in Pi:

```bash
pi -e /Users/oleg/Projects/pi-websearch-manager
```

## Versioning and release process

This package follows [Semantic Versioning](https://semver.org/). For a release:

1. Update `package.json` and `CHANGELOG.md`.
2. Run `npm run check` and `npm pack --dry-run`.
3. Commit, tag `vX.Y.Z`, and push the commit and tag.
4. Publish with `npm publish --access public`.
