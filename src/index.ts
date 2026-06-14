import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "pi-websearch-manager";
const PI_WEB_ACCESS_TOOLS = [
  "web_search",
  "code_search",
  "fetch_content",
  "get_search_content",
] as const;
const CODEX_WEB_SEARCH_TOOLS = ["web_run"] as const;
const OPENAI_RESPONSES_PROVIDERS = new Set(["openai-codex", "openai"]);

const PI_WEB_ACCESS_TOOL_SET = new Set<string>(PI_WEB_ACCESS_TOOLS);
const CODEX_WEB_SEARCH_TOOL_SET = new Set<string>(CODEX_WEB_SEARCH_TOOLS);

type RouteTarget = "openai-web-run" | "pi-web-access";

interface RouteResult {
  target: RouteTarget;
  modelLabel: string;
  activeTools: string[];
  removedTools: string[];
  enabledTools: string[];
  preferredTools: string[];
  activePreferredTools: string[];
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function modelLabel(ctx: ExtensionContext): string {
  const provider = ctx.model?.provider ?? "unknown";
  const id = ctx.model?.id ?? "unknown";
  return `${provider}/${id}`;
}

function isOpenAIResponsesModel(ctx: ExtensionContext): boolean {
  const provider = normalize(ctx.model?.provider);
  const api = normalize(ctx.model?.api);
  return OPENAI_RESPONSES_PROVIDERS.has(provider) && api.includes("responses");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function existingTools(pi: ExtensionAPI, names: readonly string[]): string[] {
  const allToolNames = new Set(pi.getAllTools().map((tool) => tool.name));
  return names.filter((name) => allToolNames.has(name));
}

function sameTools(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function activeSubset(activeTools: string[], candidates: readonly string[]): string[] {
  const candidateSet = new Set<string>(candidates);
  return activeTools.filter((toolName) => candidateSet.has(toolName));
}

function formatStatus(result: RouteResult): string | undefined {
  if (result.activePreferredTools.length === 0) return undefined;
  if (result.target === "openai-web-run" && result.activePreferredTools.includes("web_run")) {
    return "🔍 web_run";
  }
  if (result.target === "pi-web-access") {
    return "🔍 pwa";
  }
  return undefined;
}

function notifyStatus(ctx: ExtensionContext, result: RouteResult): void {
  if (!ctx.hasUI) return;
  ctx.ui.setStatus(STATUS_KEY, formatStatus(result));
}

export default function piWebsearchManager(pi: ExtensionAPI): void {
  let deferredRouteGeneration = 0;

  function routeTools(ctx: ExtensionContext): RouteResult {
    const codexWebSearchTools = existingTools(pi, CODEX_WEB_SEARCH_TOOLS);
    const openaiRoute = isOpenAIResponsesModel(ctx) && codexWebSearchTools.length > 0;
    const target: RouteTarget = openaiRoute ? "openai-web-run" : "pi-web-access";
    const activeTools = pi.getActiveTools();
    const preferredTools = openaiRoute
      ? codexWebSearchTools
      : existingTools(pi, PI_WEB_ACCESS_TOOLS);

    let nextTools = [...activeTools];
    let removedTools: string[] = [];
    const enabledTools: string[] = [];

    if (openaiRoute) {
      nextTools = nextTools.filter((toolName) => !PI_WEB_ACCESS_TOOL_SET.has(toolName));
      removedTools = activeTools.filter((toolName) => PI_WEB_ACCESS_TOOL_SET.has(toolName));
    } else {
      nextTools = nextTools.filter((toolName) => !CODEX_WEB_SEARCH_TOOL_SET.has(toolName));
      removedTools = activeTools.filter((toolName) => CODEX_WEB_SEARCH_TOOL_SET.has(toolName));
    }

    for (const toolName of preferredTools) {
      if (nextTools.includes(toolName)) continue;
      nextTools.push(toolName);
      enabledTools.push(toolName);
    }

    nextTools = unique(nextTools);
    if (!sameTools(activeTools, nextTools)) {
      pi.setActiveTools(nextTools);
    }

    const activePreferredTools = activeSubset(nextTools, preferredTools);
    const result: RouteResult = {
      target,
      modelLabel: modelLabel(ctx),
      activeTools: nextTools,
      removedTools,
      enabledTools,
      preferredTools,
      activePreferredTools,
    };
    notifyStatus(ctx, result);
    return result;
  }

  function scheduleRoute(ctx: ExtensionContext): void {
    const generation = ++deferredRouteGeneration;
    setTimeout(() => {
      if (generation !== deferredRouteGeneration) return;
      routeTools(ctx);
    }, 0);
  }

  pi.on("session_start", async (_event, ctx) => {
    routeTools(ctx);
    scheduleRoute(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    routeTools(ctx);
    scheduleRoute(ctx);
  });

  // Last-chance guard for sessions where another extension or a manual /tools
  // change reintroduced duplicate search tools after the model was selected.
  pi.on("before_agent_start", async (_event, ctx) => {
    routeTools(ctx);
  });

  pi.registerCommand("websearch-manager", {
    description: "Show and reapply model-aware web search tool routing",
    handler: async (_args, ctx) => {
      const result = routeTools(ctx);
      const removed = result.removedTools.length > 0 ? `; removed ${result.removedTools.join(", ")}` : "";
      const enabled = result.enabledTools.length > 0 ? `; enabled ${result.enabledTools.join(", ")}` : "";
      const active = result.activePreferredTools.length > 0
        ? result.activePreferredTools.join(", ")
        : "none";
      ctx.ui.notify(
        `Web search route for ${result.modelLabel}: ${result.target}; active preferred tools: ${active}${removed}${enabled}`,
        "info",
      );
    },
  });
}
