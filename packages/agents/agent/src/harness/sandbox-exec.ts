/**
 * OS-level sandbox mode for process-executing tools.
 * - 'off': no OS sandbox wrapper (default)
 * - 'workspace': restrict filesystem writes to the workspace (and /tmp)
 * - 'network-block': workspace restrictions plus no network access
 */
export type SandboxMode = 'off' | 'workspace' | 'network-block';

/**
 * Detected OS sandbox tool.
 * - Linux: bubblewrap (`bwrap`) preferred, `unshare` as fallback
 * - macOS: `sandbox-exec`
 */
export type SandboxExecTool = 'bwrap' | 'unshare' | 'sandbox-exec' | 'windows-native' | 'wsl-bwrap';

export type SandboxCapability = 'filesystem-write' | 'network' | 'read-denied';

export interface SandboxCapabilityStatus {
    capability: SandboxCapability;
    supported: boolean;
    enforcement: 'native' | 'sandbox-tool' | 'proxy' | 'process' | 'none';
    reason?: string;
}

export interface SandboxExecProbe {
    tool: SandboxExecTool | null;
    /** Human-readable reason when no tool is available (degradation notice). */
    reason?: string;
}

export type SandboxExecToolProbe = (name: string) => Promise<boolean>;

export interface SandboxExecOptions {
    /** Workspace root to bind/write-restrict to. */
    workspace?: string;
}

export interface SandboxRuntimeContext {
    os?: string;
    shellFamily?: 'posix' | 'cmd' | 'none';
}

type SpawnModule = {
    spawn: (command: string, args?: string[], options?: Record<string, any>) => any;
};

const HOST_PROCESS_MODULE = ['child', 'process'].join('_');

export function loadSandboxSpawnModule(): Promise<SpawnModule> {
    return import(HOST_PROCESS_MODULE) as unknown as Promise<SpawnModule>;
}

export function isShellCommandString(command: string, args: string[] = []): boolean {
    return args.length === 0 && /\s|[|&;<>()]/.test(String(command || '').trim());
}

function resolveShellFamily(runtime?: SandboxRuntimeContext | string): 'posix' | 'cmd' | 'none' {
    if (typeof runtime === 'string') {
        if (runtime === 'win32') {
            return 'cmd';
        }
        if (runtime === 'browser') {
            return 'none';
        }
        return runtime ? 'posix' : 'none';
    }
    if (runtime?.shellFamily) {
        return runtime.shellFamily;
    }
    if (runtime?.os === 'win32') {
        return 'cmd';
    }
    if (runtime?.os === 'browser') {
        return 'none';
    }
    return runtime?.os ? 'posix' : 'none';
}

export function resolvePlatformShellCommand(
    command: string,
    args: string[] = [],
    runtime?: SandboxRuntimeContext | string
): { command: string; args: string[] } {
    if (!isShellCommandString(command, args)) {
        return { command, args };
    }
    const shellFamily = resolveShellFamily(runtime);
    if (shellFamily === 'cmd') {
        return {
            command: 'cmd.exe',
            args: ['/d', '/s', '/c', command]
        };
    }
    if (shellFamily !== 'posix') {
        return { command, args };
    }
    return {
        command: 'sh',
        args: ['-lc', command]
    };
}

const SANDBOX_EXEC_CANDIDATES: Array<{ platform: string; tools: SandboxExecTool[] }> = [
    { platform: 'linux', tools: ['bwrap', 'unshare'] },
    { platform: 'darwin', tools: ['sandbox-exec'] },
    { platform: 'win32', tools: ['windows-native', 'wsl-bwrap'] }
];

export const DEFAULT_SANDBOX_EXEC_DEGRADATION = 'OS sandbox is not available on this platform (Windows/WSL2 falls back to process-level isolation).';

/**
 * Probe whether an executable is available on PATH.
 */
export async function probeSandboxExecTool(name: string, runtime?: SandboxRuntimeContext | string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const shellFamily = resolveShellFamily(runtime);
        if (shellFamily === 'none') {
            resolve(false);
            return;
        }
        loadSandboxSpawnModule().then(({ spawn }) => {
            try {
                const check = shellFamily === 'cmd' && name === 'wsl-bwrap'
                    ? { command: 'wsl.exe', args: ['--exec', 'sh', '-lc', 'command -v bwrap'] }
                    : shellFamily === 'cmd'
                    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', `where ${name === 'windows-native' ? 'tsdi-agent-sandbox.exe' : name}`] }
                    : { command: 'sh', args: ['-lc', `command -v ${name}`] };
                const child = spawn(check.command, check.args, {
                    stdio: ['ignore', 'pipe', 'ignore']
                });
                let found = false;
                child.stdout?.on('data', (data: Uint8Array) => {
                    if (data.toString().trim()) {
                        found = true;
                    }
                });
                child.on('close', () => resolve(found));
                child.on('error', () => resolve(false));
            } catch {
                resolve(false);
            }
        }).catch(() => resolve(false));
    });
}

/**
 * Detect the best available OS sandbox tool for the current platform.
 * `platform` and `probe` are injectable for tests.
 */
export async function detectSandboxExecTool(
    platform?: string,
    probe: SandboxExecToolProbe = probeSandboxExecTool,
    _runtime?: SandboxRuntimeContext
): Promise<SandboxExecProbe> {
    const candidate = SANDBOX_EXEC_CANDIDATES.find(entry => entry.platform === platform);
    if (!candidate) {
        return { tool: null, reason: describeSandboxExecDegradation(platform) };
    }
    for (const tool of candidate.tools) {
        if (await probe(tool)) {
            return { tool };
        }
    }
    if (platform === 'win32') {
        return { tool: null, reason: describeSandboxExecDegradation(platform) };
    }
    return { tool: null, reason: `No OS sandbox tool available on ${platform} (need ${candidate.tools.join(' or ')}).` };
}

/**
 * Human-readable degradation notice when OS sandboxing is not supported.
 */
export function describeSandboxExecDegradation(platform?: string): string {
    if (platform === 'win32') {
        return 'Windows sandbox capabilities degraded: filesystem-write=process, network=proxy-only, read-denied=unsupported. Configure a native restricted-token/Job Object host or WSL2 bwrap.';
    }
    if (platform === 'linux') {
        return 'OS sandbox requires bwrap or unshare on PATH. Falling back to process-level isolation.';
    }
    if (platform === 'darwin') {
        return 'OS sandbox requires sandbox-exec on PATH. Falling back to process-level isolation.';
    }
    return DEFAULT_SANDBOX_EXEC_DEGRADATION;
}

export function describeSandboxCapabilities(
    platform: string | undefined,
    probe: SandboxExecProbe,
    proxyConfigured = false
): SandboxCapabilityStatus[] {
    const tool = probe.tool;
    const native = tool === 'windows-native';
    const sandboxTool = tool === 'bwrap' || tool === 'sandbox-exec' || tool === 'wsl-bwrap';
    const filesystem = native || sandboxTool;
    const network = filesystem || tool === 'unshare' || proxyConfigured;
    const readDenied = native || tool === 'bwrap' || tool === 'wsl-bwrap';
    return [
        { capability: 'filesystem-write', supported: filesystem, enforcement: native ? 'native' : sandboxTool ? 'sandbox-tool' : 'process', ...(!filesystem ? { reason: describeSandboxExecDegradation(platform) } : {}) },
        { capability: 'network', supported: network, enforcement: native ? 'native' : filesystem || tool === 'unshare' ? 'sandbox-tool' : proxyConfigured ? 'proxy' : 'none', ...(!network ? { reason: describeSandboxExecDegradation(platform) } : {}) },
        { capability: 'read-denied', supported: readDenied, enforcement: native ? 'native' : readDenied ? 'sandbox-tool' : 'none', ...(!readDenied ? { reason: describeSandboxExecDegradation(platform) } : {}) }
    ];
}

/**
 * Build the wrapped command line that runs `command` under the OS sandbox tool.
 * Pure function; returns `null` when the tool cannot express the requested mode.
 */
export function buildSandboxExecCommand(
    tool: SandboxExecTool,
    mode: SandboxMode,
    command: string,
    args: string[],
    options: SandboxExecOptions = {}
): { command: string; args: string[] } | null {
    if (mode === 'off') {
        return { command, args };
    }
    const workspace = options.workspace;
    switch (tool) {
        case 'bwrap': {
            const bwrapArgs: string[] = [];
            if (mode === 'network-block') {
                bwrapArgs.push('--unshare-all', '--unshare-net');
            } else {
                bwrapArgs.push('--unshare-pid', '--unshare-ipc', '--unshare-uts');
            }
            bwrapArgs.push('--ro-bind', '/', '/');
            if (workspace) {
                bwrapArgs.push('--bind', workspace, workspace, '--chdir', workspace);
            }
            bwrapArgs.push('--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp');
            return { command: 'bwrap', args: [...bwrapArgs, '--', command, ...args] };
        }
        case 'unshare': {
            if (mode === 'network-block') {
                return { command: 'unshare', args: ['--net', '--', command, ...args] };
            }
            if (mode === 'workspace') {
                return {
                    command: 'unshare',
                    args: ['--map-root-user', '--fork', '--pid', '--kill-child', '--mount', '--', command, ...args]
                };
            }
            return null;
        }
        case 'sandbox-exec': {
            if (mode === 'workspace' && !workspace) {
                return null;
            }
            const profile = buildMacSandboxProfile(mode, workspace);
            return { command: 'sandbox-exec', args: ['-p', profile, command, ...args] };
        }
        case 'wsl-bwrap': {
            const wrapped = buildSandboxExecCommand('bwrap', mode, command, args, options);
            return wrapped ? { command: 'wsl.exe', args: ['--exec', wrapped.command, ...wrapped.args] } : null;
        }
        case 'windows-native': {
            const nativeArgs = ['--mode', mode];
            if (workspace) {
                nativeArgs.push('--workspace', workspace);
            }
            return { command: 'tsdi-agent-sandbox.exe', args: [...nativeArgs, '--', command, ...args] };
        }
        default:
            return null;
    }
}

function buildMacSandboxProfile(mode: SandboxMode, workspace?: string): string {
    let profile = '(version 1) (allow default) (deny file-write*)';
    if (workspace) {
        profile += ` (allow file-write* (subpath "${workspace}") (subpath "/tmp") (subpath "/var/tmp"))`;
    }
    if (mode === 'network-block') {
        profile += ' (deny network*)';
    }
    return profile;
}

/**
 * A3: whether a command line references an allowlisted network destination.
 * Allowlist entries are hostnames or URL prefixes; matching is a case-
 * insensitive substring test against the raw command line (e.g. `curl
 * https://api.example.com/...` contains `api.example.com`).
 */
export function commandReferencesAllowlistedDestination(commandLine: string, allowlist?: string[]): boolean {
    if (!commandLine || !allowlist || allowlist.length === 0) {
        return false;
    }
    const normalized = String(commandLine).toLowerCase();
    return allowlist.some(entry => {
        const candidate = String(entry ?? '').trim().toLowerCase();
        return candidate.length > 0 && normalized.includes(candidate);
    });
}
