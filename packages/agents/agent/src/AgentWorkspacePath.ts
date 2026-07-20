export interface AgentWorkspacePathAdapter {
    resolve(...paths: string[]): string;
    join(...paths: string[]): string;
    existsSync(path: string): boolean;
}

export interface ResolveAgentWorkspacePathOptions {
    currentDirectory?: string;
    explicitWorkspace?: string;
    fallbackWorkspace?: string;
    gitMarkerName?: string;
    adapter?: AgentWorkspacePathAdapter;
    dirname?: (path: string) => string;
}

function defaultDirname(input: string): string {
    const value = String(input || '');
    if (!value) {
        return value;
    }
    const trimmed = value.replace(/[\\/]+$/, '');
    if (!trimmed) {
        return value;
    }
    const lastSlash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
    if (lastSlash < 0) {
        return trimmed;
    }
    if (lastSlash === 0) {
        return trimmed.charAt(0);
    }
    const parent = trimmed.slice(0, lastSlash);
    if (/^[a-zA-Z]:$/.test(parent)) {
        return `${parent}\\`;
    }
    return parent || trimmed;
}

export function findAgentWorkspaceRoot(
    currentDirectory: string,
    adapter: AgentWorkspacePathAdapter,
    dirname: (path: string) => string = defaultDirname,
    gitMarkerName = '.git'
): string {
    const launchDirectory = adapter.resolve(currentDirectory);
    let current = launchDirectory;
    while (current) {
        if (adapter.existsSync(adapter.join(current, gitMarkerName))) {
            return current;
        }
        const parent = dirname(current);
        if (!parent || parent === current) {
            return launchDirectory;
        }
        current = parent;
    }
    return launchDirectory;
}

export function resolveAgentWorkspacePath(options: ResolveAgentWorkspacePathOptions): string {
    const fallbackWorkspace = options.fallbackWorkspace || options.currentDirectory || options.explicitWorkspace || '';
    if (options.explicitWorkspace) {
        return options.adapter
            ? options.adapter.resolve(options.explicitWorkspace)
            : options.explicitWorkspace;
    }
    if (!options.currentDirectory || !options.adapter) {
        return fallbackWorkspace;
    }
    return findAgentWorkspaceRoot(
        options.currentDirectory,
        options.adapter,
        options.dirname,
        options.gitMarkerName
    ) || fallbackWorkspace;
}
