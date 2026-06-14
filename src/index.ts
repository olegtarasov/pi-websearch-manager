import type { ExtensionAPI, ExtensionContext, SourceInfo, ToolInfo } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "pi-websearch-manager";
const EXTENSION_WEB_SEARCH_TOOLS = [
  "web_search",
  "code_search",
  "fetch_content",
  "get_search_content",
  "web_fetch",
] as const;
const CODEX_WEB_SEARCH_TOOLS = ["web_run"] as const;
const OPENAI_RESPONSES_PROVIDERS = new Set(["openai-codex", "openai"]);

const EXTENSION_WEB_SEARCH_TOOL_SET = new Set<string>(EXTENSION_WEB_SEARCH_TOOLS);
const CODEX_WEB_SEARCH_TOOL_SET = new Set<string>(CODEX_WEB_SEARCH_TOOLS);

type RouteTarget = "openai-web-run" | "extension-web-search";

interface RouteResult {
  target: RouteTarget;
  modelLabel: string;
  extensionSearchLabel: string | undefined;
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

function existingToolInfos(allTools: ToolInfo[], names: readonly string[]): ToolInfo[] {
  const toolsByName = new Map(allTools.map((tool) => [tool.name, tool]));
  return names.flatMap((name) => {
    const tool = toolsByName.get(name);
    return tool ? [tool] : [];
  });
}

function sameTools(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function activeSubset(activeTools: string[], candidates: readonly string[]): string[] {
  const candidateSet = new Set<string>(candidates);
  return activeTools.filter((toolName) => candidateSet.has(toolName));
}

function activeToolInfos(activeTools: string[], candidates: ToolInfo[]): ToolInfo[] {
  const activeSet = new Set<string>(activeTools);
  return candidates.filter((tool) => activeSet.has(tool.name));
}

function stripNpmVersion(packageName: string): string {
  if (packageName.startsWith("@")) {
    const slashIndex = packageName.indexOf("/");
    if (slashIndex === -1) return packageName;
    const versionIndex = packageName.indexOf("@", slashIndex + 1);
    return versionIndex === -1 ? packageName : packageName.slice(0, versionIndex);
  }

  const versionIndex = packageName.indexOf("@");
  return versionIndex === -1 ? packageName : packageName.slice(0, versionIndex);
}

function packageDisplayName(packageName: string): string | undefined {
  const name = stripNpmVersion(packageName.trim());
  if (!name) return undefined;
  const segments = name.split("/").filter(Boolean);
  return segments[segments.length - 1] || undefined;
}

function extensionDisplayName(sourceInfo: SourceInfo | undefined): string | undefined {
  const source = sourceInfo?.source.trim();
  if (!source) return undefined;

  if (source.startsWith("npm:")) {
    return packageDisplayName(source.slice("npm:".length));
  }

  if (source.startsWith("git:")) {
    const withoutRef = source.slice("git:".length).split("#")[0] ?? "";
    const withoutGitSuffix = withoutRef.replace(/\.git$/, "");
    return packageDisplayName(withoutGitSuffix);
  }

  if (source === "auto" || source === "cli" || source === "local") {
    return undefined;
  }

  return source;
}

function extensionSearchLabel(activePreferredToolInfos: ToolInfo[]): string | undefined {
  const labels = unique(
    activePreferredToolInfos
      .map((tool) => extensionDisplayName(tool.sourceInfo))
      .filter((label): label is string => Boolean(label)),
  );
  return labels.length === 1 ? labels[0] : undefined;
}

function formatStatus(result: RouteResult): string | undefined {
  if (result.activePreferredTools.length === 0) return undefined;
  if (result.target === "openai-web-run" && result.activePreferredTools.includes("web_run")) {
    return "🔍 web_run";
  }
  if (result.target === "extension-web-search") {
    return `🔍 ${result.extensionSearchLabel ?? "ext. search"}`;
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
    const allTools = pi.getAllTools();
    const codexWebSearchTools = existingToolInfos(allTools, CODEX_WEB_SEARCH_TOOLS).map((tool) => tool.name);
    const openaiRoute = isOpenAIResponsesModel(ctx) && codexWebSearchTools.length > 0;
    const target: RouteTarget = openaiRoute ? "openai-web-run" : "extension-web-search";
    const activeTools = pi.getActiveTools();
    const extensionWebSearchToolInfos = existingToolInfos(allTools, EXTENSION_WEB_SEARCH_TOOLS);
    const preferredTools = openaiRoute
      ? codexWebSearchTools
      : extensionWebSearchToolInfos.map((tool) => tool.name);

    let nextTools = [...activeTools];
    let removedTools: string[] = [];
    const enabledTools: string[] = [];

    if (openaiRoute) {
      nextTools = nextTools.filter((toolName) => !EXTENSION_WEB_SEARCH_TOOL_SET.has(toolName));
      removedTools = activeTools.filter((toolName) => EXTENSION_WEB_SEARCH_TOOL_SET.has(toolName));
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
    const extensionSearchActiveToolInfos = target === "extension-web-search"
      ? activeToolInfos(activePreferredTools, extensionWebSearchToolInfos)
      : [];
    const result: RouteResult = {
      target,
      modelLabel: modelLabel(ctx),
      extensionSearchLabel: extensionSearchLabel(extensionSearchActiveToolInfos),
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
      const extensionSource = result.target === "extension-web-search" && result.extensionSearchLabel
        ? ` (${result.extensionSearchLabel})`
        : "";
      ctx.ui.notify(
        `Web search route for ${result.modelLabel}: ${result.target}${extensionSource}; active preferred tools: ${active}${removed}${enabled}`,
        "info",
      );
    },
  });
}
