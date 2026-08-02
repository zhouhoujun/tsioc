import { AgentToolDefinition, AgentToolExecutionHints, AgentToolSandboxCapability } from '../tools/AgentTool';
import { SandboxPolicy, createSandboxPolicy, restrictedSandboxPolicy } from './SandboxExecutor';

const DEFAULT_DENIED_ENV_VARS = [
    'AWS_SECRET',
    'API_KEY',
    'TOKEN',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'DEEPSEEK_API_KEY',
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'OPENROUTER_API_KEY'
];

const TOOLSET_CAPABILITY_MAP: Record<string, AgentToolSandboxCapability> = {
    filesystem: 'readonly_fs',
    filesystem_write: 'workspace_write',
    search: 'readonly_fs',
    process: 'process_exec',
    terminal: 'process_exec',
    git: 'vcs_exec',
    ai_cli: 'process_exec',
    code_execution: 'code_exec',
    lsp: 'readonly_fs',
    http: 'network_fetch',
    web: 'network_fetch',
    browser: 'network_fetch',
    capture: 'gui_capture'
};

export function inferToolSandboxCapability(toolset?: string): AgentToolSandboxCapability | undefined {
    if (!toolset) {
        return undefined;
    }
    return TOOLSET_CAPABILITY_MAP[toolset];
}

export function resolveDefaultToolSandboxPolicy(
    capabilityOrToolset?: AgentToolSandboxCapability | string,
    workspace?: string
): SandboxPolicy | null {
    const capability = normalizeCapability(capabilityOrToolset);
    if (!capability) {
        return null;
    }

    switch (capability) {
        case 'readonly_fs':
        case 'workspace_write':
            return null;
        case 'process_exec':
            return createSandboxPolicy({
                enabled: true,
                isolationLevel: 'process',
                workingDirectory: workspace,
                deniedEnvVars: DEFAULT_DENIED_ENV_VARS,
                resourceLimits: {
                    wallTimeMs: 120_000,
                    memoryBytes: 256 * 1024 * 1024,
                    maxProcesses: 16
                },
                networkAccess: 'full'
            });
        case 'vcs_exec':
            return createSandboxPolicy({
                enabled: true,
                isolationLevel: 'process',
                workingDirectory: workspace,
                deniedEnvVars: DEFAULT_DENIED_ENV_VARS,
                resourceLimits: {
                    wallTimeMs: 120_000,
                    memoryBytes: 256 * 1024 * 1024,
                    maxProcesses: 16
                },
                networkAccess: 'full'
            });
        case 'network_fetch':
            return createSandboxPolicy({
                enabled: true,
                isolationLevel: 'process',
                workingDirectory: workspace,
                deniedEnvVars: DEFAULT_DENIED_ENV_VARS,
                resourceLimits: {
                    wallTimeMs: 60_000,
                    memoryBytes: 128 * 1024 * 1024,
                    maxProcesses: 4
                },
                networkAccess: 'outbound'
            });
        case 'gui_capture':
            return createSandboxPolicy({
                enabled: true,
                isolationLevel: 'process',
                workingDirectory: workspace,
                deniedEnvVars: DEFAULT_DENIED_ENV_VARS,
                resourceLimits: {
                    wallTimeMs: 60_000,
                    memoryBytes: 128 * 1024 * 1024,
                    maxProcesses: 4
                },
                networkAccess: 'none'
            });
        case 'code_exec':
            return {
                ...restrictedSandboxPolicy,
                workingDirectory: workspace,
                allowedWritePaths: uniqueStrings([
                    ...(restrictedSandboxPolicy.allowedWritePaths ?? []),
                    workspace
                ]),
                deniedEnvVars: uniqueStrings([
                    ...(restrictedSandboxPolicy.deniedEnvVars ?? []),
                    ...DEFAULT_DENIED_ENV_VARS
                ])
            };
        default:
            return null;
    }
}

export function resolveToolExecutionHints(
    definition: Pick<AgentToolDefinition, 'toolset' | 'execution'>,
    workspace?: string
): AgentToolExecutionHints | undefined {
    const existing = definition.execution;
    const capability = existing?.sandboxCapability ?? inferToolSandboxCapability(definition.toolset);
    const defaultSandbox = !existing?.sandbox && !existing?.isolationLevel
        ? resolveDefaultToolSandboxPolicy(capability, workspace)
        : null;

    if (!existing && !capability && !defaultSandbox) {
        return undefined;
    }

    return {
        ...(existing ?? {}),
        sandboxCapability: capability ?? existing?.sandboxCapability,
        sandbox: existing?.sandbox ?? defaultSandbox ?? undefined
    };
}

export interface ToolSandboxState {
    capability?: AgentToolSandboxCapability;
    policy?: SandboxPolicy | null;
    supported: boolean;
    applied: boolean;
}

export function resolveToolSandboxState(
    definition: Pick<AgentToolDefinition, 'toolset' | 'execution'>,
    workspace?: string,
    supported = false
): ToolSandboxState {
    const capability = definition.execution?.sandboxCapability ?? inferToolSandboxCapability(definition.toolset);
    const policy = resolveToolSandboxPolicy(definition.execution, capability, workspace);
    return {
        capability,
        policy,
        supported,
        applied: !!policy && supported
    };
}

export function resolveToolSandboxPolicy(
    execution: AgentToolExecutionHints | undefined,
    capability?: AgentToolSandboxCapability,
    workspace?: string
): SandboxPolicy | null {
    if (execution?.sandbox) {
        return withSandboxWorkingDirectory(execution.sandbox, workspace);
    }
    if (execution?.isolationLevel) {
        return withSandboxWorkingDirectory({
            enabled: true,
            isolationLevel: execution.isolationLevel,
            resourceLimits: execution.resourceLimits,
            workingDirectory: workspace
        }, workspace);
    }
    return capability ? resolveDefaultToolSandboxPolicy(capability, workspace) : null;
}

export function withSandboxWorkingDirectory(policy: SandboxPolicy, workspace?: string): SandboxPolicy {
    if (!workspace || policy.workingDirectory) {
        return policy;
    }
    return {
        ...policy,
        workingDirectory: workspace
    };
}

function normalizeCapability(capabilityOrToolset?: AgentToolSandboxCapability | string): AgentToolSandboxCapability | undefined {
    if (!capabilityOrToolset) {
        return undefined;
    }
    if (capabilityOrToolset in TOOLSET_CAPABILITY_MAP) {
        return TOOLSET_CAPABILITY_MAP[capabilityOrToolset];
    }
    return capabilityOrToolset as AgentToolSandboxCapability;
}

function uniqueStrings(values: Array<string | undefined>): string[] | undefined {
    const filtered = values.filter((value): value is string => typeof value === 'string' && !!value.trim());
    return filtered.length ? Array.from(new Set(filtered.map(value => value.trim()))) : undefined;
}
