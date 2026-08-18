import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI, ExtensionContext, SourceInfo, ToolInfo } from "@earendil-works/pi-coding-agent";
import piWebsearchManager from "../src/index.ts";

type TestHandler = (event: unknown, ctx: ExtensionContext) => Promise<unknown> | unknown;
type CommandHandler = (args: string, ctx: ExtensionContext) => Promise<unknown> | unknown;

const PACKAGE_SOURCES = {
  codex: "npm:@howaboua/pi-codex-conversion@3.0.15",
  piWebAccess: "npm:pi-web-access@0.23.0",
  rpivWebTools: "npm:@juicesharp/rpiv-web-tools@2.6.1",
} as const;

function sourceInfo(source: string, path = `/extensions/${source}/index.ts`): SourceInfo {
  return {
    path,
    source,
    scope: "user",
    origin: source.startsWith("npm:") ? "package" : "top-level",
  };
}

function tool(name: string, source: SourceInfo): ToolInfo {
  return {
    name,
    description: name,
    parameters: {} as ToolInfo["parameters"],
    sourceInfo: source,
  };
}

function codexTool(name: string): ToolInfo {
  return tool(name, sourceInfo(PACKAGE_SOURCES.codex));
}

function piWebAccessTool(name: string): ToolInfo {
  return tool(name, sourceInfo(PACKAGE_SOURCES.piWebAccess));
}

function rpivTool(name: string): ToolInfo {
  return tool(name, sourceInfo(PACKAGE_SOURCES.rpivWebTools));
}

function createHarness(allTools: ToolInfo[], initialActiveTools: string[], model = { provider: "openai-codex", id: "gpt-5.6-sol", api: "openai-responses" }) {
  const handlers = new Map<string, TestHandler[]>();
  const commands = new Map<string, CommandHandler>();
  const statuses = new Map<string, string | undefined>();
  let activeTools = [...initialActiveTools];

  const context = {
    model,
    hasUI: true,
    ui: {
      setStatus(key: string, value: string | undefined) {
        statuses.set(key, value);
      },
      notify() {},
    },
  } as unknown as ExtensionContext;

  const api = {
    on(event: string, handler: TestHandler) {
      const eventHandlers = handlers.get(event) ?? [];
      eventHandlers.push(handler);
      handlers.set(event, eventHandlers);
    },
    registerCommand(name: string, command: { handler: CommandHandler }) {
      commands.set(name, command.handler);
    },
    getAllTools() {
      return allTools;
    },
    getActiveTools() {
      return [...activeTools];
    },
    setActiveTools(nextTools: string[]) {
      activeTools = [...nextTools];
    },
  } as unknown as ExtensionAPI;

  piWebsearchManager(api);

  return {
    activeTools: () => activeTools,
    status: () => statuses.get("pi-websearch-manager"),
    setActiveTools(nextTools: string[]) {
      activeTools = [...nextTools];
    },
    async emit(event: "session_start" | "model_select" | "before_agent_start") {
      for (const handler of handlers.get(event) ?? []) await handler({ type: event }, context);
      if (event !== "before_agent_start") {
        await new Promise<void>((resolve) => setTimeout(resolve, 1));
      }
    },
    async runCommand(name: string, args = "") {
      const handler = commands.get(name);
      assert.ok(handler, `command ${name} was not registered`);
      await handler(args, context);
    },
  };
}

const PI_WEB_ACCESS_DEFAULT_TOOLS = [
  "web_search",
  "source_check",
  "fetch_content",
  "get_search_content",
].map(piWebAccessTool);

test("normal Codex routing removes every current pi-web-access tool, including source_check", async () => {
  const harness = createHarness(
    [codexTool("web_run"), ...PI_WEB_ACCESS_DEFAULT_TOOLS],
    ["exec_command", "web_run", "web_search", "source_check", "fetch_content", "get_search_content"],
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["exec_command", "web_run"]);
  assert.equal(harness.status(), "🔍 web_run");
});

test("Code Mode keeps web search nested and does not reactivate top-level providers", async () => {
  const harness = createHarness(
    [codexTool("exec"), codexTool("wait"), codexTool("web_run"), ...PI_WEB_ACCESS_DEFAULT_TOOLS],
    ["exec", "wait", "web_search", "source_check"],
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["exec", "wait"]);
  assert.equal(harness.status(), "🔍 web__run");
});

test("Notebook mode removes an accidentally active top-level web_run", async () => {
  const harness = createHarness(
    [codexTool("exec"), codexTool("wait"), codexTool("notebook"), codexTool("web_run"), rpivTool("web_search")],
    ["exec", "wait", "notebook", "web_run", "web_search"],
  );

  await harness.emit("before_agent_start");

  assert.deepEqual(harness.activeTools(), ["exec", "wait", "notebook"]);
  assert.equal(harness.status(), "🔍 web__run");
});

test("Notebook without active exec does not claim nested web search is available", async () => {
  const harness = createHarness(
    [codexTool("exec"), codexTool("notebook"), codexTool("web_run"), ...PI_WEB_ACCESS_DEFAULT_TOOLS],
    ["read", "notebook"],
  );

  await harness.emit("before_agent_start");

  assert.deepEqual(harness.activeTools(), ["read", "notebook"]);
  assert.equal(harness.status(), undefined);
});

test("an active Codex-owned web_run is authoritative for configured provider aliases", async () => {
  const harness = createHarness(
    [codexTool("web_run"), rpivTool("web_search"), rpivTool("web_fetch")],
    ["read", "web_run", "web_search", "web_fetch"],
    { provider: "company-openai", id: "gpt-5.6-sol", api: "custom-responses-v2" },
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["read", "web_run"]);
});

test("pi-web-access tool renames are discovered from package provenance", async () => {
  const renamedTools = ["research_web", "verify_source", "read_url", "read_search_result"].map(piWebAccessTool);
  const harness = createHarness(
    [codexTool("web_run"), ...renamedTools],
    ["read"],
    { provider: "anthropic", id: "claude-opus", api: "anthropic-messages" },
  );

  await harness.emit("session_start");

  assert.deepEqual(harness.activeTools(), ["read", "research_web", "verify_source", "read_url", "read_search_result"]);
  assert.equal(harness.status(), "🔍 pi-web-access");
});

test("rpiv-web-tools defaults remain supported", async () => {
  const harness = createHarness(
    [codexTool("web_run"), rpivTool("web_search"), rpivTool("web_fetch")],
    ["read"],
    { provider: "anthropic", id: "claude-opus", api: "anthropic-messages" },
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["read", "web_search", "web_fetch"]);
  assert.equal(harness.status(), "🔍 rpiv-web-tools");
});

test("the pre-turn guard preserves a manual choice to disable managed search", async () => {
  const harness = createHarness(
    [codexTool("web_run"), ...PI_WEB_ACCESS_DEFAULT_TOOLS],
    ["read"],
    { provider: "anthropic", id: "claude-opus", api: "anthropic-messages" },
  );

  await harness.emit("before_agent_start");

  assert.deepEqual(harness.activeTools(), ["read"]);
  assert.equal(harness.status(), undefined);
});

test("the manager command explicitly reapplies a manually disabled route", async () => {
  const harness = createHarness(
    [codexTool("web_run"), ...PI_WEB_ACCESS_DEFAULT_TOOLS],
    ["read"],
    { provider: "anthropic", id: "claude-opus", api: "anthropic-messages" },
  );

  await harness.runCommand("websearch-manager");

  assert.deepEqual(harness.activeTools(), [
    "read",
    "web_search",
    "source_check",
    "fetch_content",
    "get_search_content",
  ]);
  assert.equal(harness.status(), "🔍 pi-web-access");
});

test("the pre-turn guard removes conflicts without re-enabling disabled preferred tools", async () => {
  const harness = createHarness(
    [codexTool("web_run"), ...PI_WEB_ACCESS_DEFAULT_TOOLS],
    ["read", "web_run", "source_check"],
  );

  await harness.emit("before_agent_start");

  assert.deepEqual(harness.activeTools(), ["read", "web_run"]);
});

test("unrelated package tools with generic web names are left untouched", async () => {
  const unrelatedSource = sourceInfo("npm:unrelated-research-extension@1.0.0");
  const harness = createHarness(
    [codexTool("web_run"), tool("web_search", unrelatedSource), tool("source_check", unrelatedSource)],
    ["read", "web_run", "web_search", "source_check"],
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["read", "web_run", "web_search", "source_check"]);
});

test("unrelated top-level tools with generic web names are left untouched", async () => {
  const unrelatedSource = sourceInfo("local", "/work/custom-research/index.ts");
  const harness = createHarness(
    [codexTool("web_run"), tool("web_search", unrelatedSource), tool("source_check", unrelatedSource)],
    ["read", "web_run", "web_search", "source_check"],
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["read", "web_run", "web_search", "source_check"]);
});

test("similar local directory names are not mistaken for supported providers", async () => {
  const unrelatedSource = sourceInfo("cli", "/work/pi-web-accessibility/index.ts");
  const harness = createHarness(
    [codexTool("web_run"), tool("web_search", unrelatedSource)],
    ["read", "web_run", "web_search"],
  );

  await harness.emit("model_select");

  assert.deepEqual(harness.activeTools(), ["read", "web_run", "web_search"]);
});

test("git and local checkout provenance identifies the supported providers", async () => {
  const localPiWebAccess = sourceInfo("cli", "/work/pi-web-access/index.ts");
  const gitRpiv = sourceInfo("git:https://github.com/juicesharp/rpiv-mono.git#main", "/cache/rpiv-mono/packages/rpiv-web-tools/index.ts");
  const harness = createHarness(
    [tool("custom_search", localPiWebAccess), tool("web_fetch", gitRpiv)],
    ["read"],
    { provider: "anthropic", id: "claude-opus", api: "anthropic-messages" },
  );

  await harness.emit("session_start");

  assert.deepEqual(harness.activeTools(), ["read", "custom_search", "web_fetch"]);
  assert.equal(harness.status(), "🔍 ext. search");
});
