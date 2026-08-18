import type { ExtensionAPI, ExtensionContext, SourceInfo, ToolInfo } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "pi-websearch-manager";
const CODEX_WEB_SEARCH_TOOL_NAME = "web_run";
const CODEX_EXEC_TOOL_NAME = "exec";

const PACKAGE_NAMES = {
  codex: "@howaboua/pi-codex-conversion",
  piWebAccess: "pi-web-access",
  rpivWebTools: "@juicesharp/rpiv-web-tools",
} as const;

type ManagedProvider = keyof typeof PACKAGE_NAMES;
type RouteTarget = "codex-web-run" | "codex-nested-web-run" | "extension-web-search";

interface RouteResult {
  target: RouteTarget;
  modelLabel: string;
  extensionSearchLabel: string | undefined;
  removedTools: string[];
  enabledTools: string[];
  activePreferredTools: string[];
}

interface RouteOptions {
  activatePreferredTools: boolean;
}

function modelLabel(ctx: ExtensionContext): string {
  const provider = ctx.model?.provider ?? "unknown";
  const id = ctx.model?.id ?? "unknown";
  return `${provider}/${id}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sameTools(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function activeSubset(activeTools: string[], candidates: readonly string[]): string[] {
  const candidateSet = new Set(candidates);
  return activeTools.filter((toolName) => candidateSet.has(toolName));
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

function npmPackageName(source: string): string | undefined {
  if (!source.startsWith("npm:")) return undefined;
  const name = stripNpmVersion(source.slice("npm:".length).trim());
  return name || undefined;
}

function provenanceSegments(sourceInfo: SourceInfo): string[] {
  return [sourceInfo.source, sourceInfo.path, sourceInfo.baseDir]
    .filter((value): value is string => Boolean(value))
    .join("/")
    .replaceAll("\\", "/")
    .toLowerCase()
    .split(/[\/#?]/)
    .map((segment) => segment.replace(/\.git$/, ""));
}

function hasPackageDirectory(sourceInfo: SourceInfo, packageName: string): boolean {
  const directoryName = packageName.split("/").at(-1);
  return Boolean(directoryName && provenanceSegments(sourceInfo).includes(directoryName));
}

function providerFromSource(sourceInfo: SourceInfo): ManagedProvider | undefined {
  const packageName = npmPackageName(sourceInfo.source);
  if (packageName === PACKAGE_NAMES.codex) return "codex";
  if (packageName === PACKAGE_NAMES.piWebAccess) return "piWebAccess";
  if (packageName === PACKAGE_NAMES.rpivWebTools) return "rpivWebTools";

  if (hasPackageDirectory(sourceInfo, PACKAGE_NAMES.codex)) return "codex";
  if (hasPackageDirectory(sourceInfo, PACKAGE_NAMES.piWebAccess)) return "piWebAccess";
  if (hasPackageDirectory(sourceInfo, PACKAGE_NAMES.rpivWebTools)) return "rpivWebTools";
  return undefined;
}

function providerDisplayName(provider: ManagedProvider): string {
  if (provider === "piWebAccess") return PACKAGE_NAMES.piWebAccess;
  if (provider === "rpivWebTools") return "rpiv-web-tools";
  return "pi-codex-conversion";
}

function toolProvider(tool: ToolInfo): ManagedProvider | undefined {
  return providerFromSource(tool.sourceInfo);
}

function isCodexTool(tool: ToolInfo): boolean {
  return toolProvider(tool) === "codex";
}

function isExtensionWebSearchTool(tool: ToolInfo): boolean {
  const provider = toolProvider(tool);
  return provider === "piWebAccess" || provider === "rpivWebTools";
}

function extensionSearchLabel(activeToolInfos: ToolInfo[]): string | undefined {
  const providers = unique(
    activeToolInfos
      .map(toolProvider)
      .filter((provider): provider is ManagedProvider => provider === "piWebAccess" || provider === "rpivWebTools")
      .map(providerDisplayName),
  );
  return providers.length === 1 ? providers[0] : undefined;
}

function formatStatus(result: RouteResult): string | undefined {
  if (result.target === "codex-nested-web-run") return "🔍 web__run";
  if (result.target === "codex-web-run" && result.activePreferredTools.includes(CODEX_WEB_SEARCH_TOOL_NAME)) {
    return "🔍 web_run";
  }
  if (result.target === "extension-web-search" && result.activePreferredTools.length > 0) {
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

  function routeTools(ctx: ExtensionContext, options: RouteOptions): RouteResult {
    const allTools = pi.getAllTools();
    const activeTools = pi.getActiveTools();
    const activeToolSet = new Set(activeTools);
    const codexWebSearchTool = allTools.find(
      (tool) => tool.name === CODEX_WEB_SEARCH_TOOL_NAME && isCodexTool(tool),
    );
    const codexCodeModeActive = allTools.some(
      (tool) => isCodexTool(tool) && tool.name === CODEX_EXEC_TOOL_NAME && activeToolSet.has(tool.name),
    );
    const extensionWebSearchToolInfos = allTools.filter(isExtensionWebSearchTool);
    const extensionWebSearchTools = extensionWebSearchToolInfos.map((tool) => tool.name);

    let target: RouteTarget;
    if (codexWebSearchTool && codexCodeModeActive) {
      target = "codex-nested-web-run";
    } else if (codexWebSearchTool && activeToolSet.has(codexWebSearchTool.name)) {
      target = "codex-web-run";
    } else {
      target = "extension-web-search";
    }

    const preferredTools = target === "codex-web-run"
      ? [CODEX_WEB_SEARCH_TOOL_NAME]
      : target === "extension-web-search"
        ? extensionWebSearchTools
        : [];
    const toolsToRemove = target === "extension-web-search"
      ? new Set(codexWebSearchTool ? [codexWebSearchTool.name] : [])
      : new Set([
          ...extensionWebSearchTools,
          ...(target === "codex-nested-web-run" && codexWebSearchTool ? [codexWebSearchTool.name] : []),
        ]);
    const removedTools = activeTools.filter((toolName) => toolsToRemove.has(toolName));
    const nextTools = activeTools.filter((toolName) => !toolsToRemove.has(toolName));
    const enabledTools: string[] = [];

    if (options.activatePreferredTools) {
      for (const toolName of preferredTools) {
        if (nextTools.includes(toolName)) continue;
        nextTools.push(toolName);
        enabledTools.push(toolName);
      }
    }

    const uniqueNextTools = unique(nextTools);
    if (!sameTools(activeTools, uniqueNextTools)) {
      pi.setActiveTools(uniqueNextTools);
    }

    const activePreferredTools = activeSubset(uniqueNextTools, preferredTools);
    const activePreferredSet = new Set(activePreferredTools);
    const activeExtensionToolInfos = target === "extension-web-search"
      ? extensionWebSearchToolInfos.filter((tool) => activePreferredSet.has(tool.name))
      : [];
    const result: RouteResult = {
      target,
      modelLabel: modelLabel(ctx),
      extensionSearchLabel: extensionSearchLabel(activeExtensionToolInfos),
      removedTools,
      enabledTools,
      activePreferredTools,
    };
    notifyStatus(ctx, result);
    return result;
  }

  function scheduleRoute(ctx: ExtensionContext): void {
    const generation = ++deferredRouteGeneration;
    setTimeout(() => {
      if (generation !== deferredRouteGeneration) return;
      routeTools(ctx, { activatePreferredTools: true });
    }, 0);
  }

  pi.on("session_start", async (_event, ctx) => {
    routeTools(ctx, { activatePreferredTools: true });
    scheduleRoute(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    routeTools(ctx, { activatePreferredTools: true });
    scheduleRoute(ctx);
  });

  // Remove conflicts just before a turn, but preserve an explicit /tools choice
  // that disabled every managed search tool after the last model selection.
  pi.on("before_agent_start", async (_event, ctx) => {
    routeTools(ctx, { activatePreferredTools: false });
  });

  pi.registerCommand("websearch-manager", {
    description: "Show and reapply active-plan web search tool routing",
    handler: async (_args, ctx) => {
      const result = routeTools(ctx, { activatePreferredTools: true });
      const removed = result.removedTools.length > 0 ? `; removed ${result.removedTools.join(", ")}` : "";
      const enabled = result.enabledTools.length > 0 ? `; enabled ${result.enabledTools.join(", ")}` : "";
      const active = result.target === "codex-nested-web-run"
        ? "web__run (nested in exec)"
        : result.activePreferredTools.length > 0
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
