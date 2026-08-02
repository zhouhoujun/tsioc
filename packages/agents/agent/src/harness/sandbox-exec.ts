import { spawn } from 'child_process';

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
export type SandboxExecTool = 'bwrap' | 'unshare' | 'sandbox-exec';

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

const SANDBOX_EXEC_CANDIDATES: Array<{ platform: string; tools: SandboxExecTool[] }> = [
    { platform: 'linux', tools: ['bwrap', 'unshare'] },
    { platform: 'darwin', tools: ['sandbox-exec'] }
];

export const DEFAULT_SANDBOX_EXEC_DEGRADATION = 'OS sandbox is not available on this platform (Windows/WSL2 falls back to process-level isolation).';

/**
 * Probe whether an executable is available on PATH.
 */
export async function probeSandboxExecTool(name: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        try {
            const child = spawn('sh', ['-c', `command -v ${name}`], {
                stdio: ['ignore', 'pipe', 'ignore']
            });
            let found = false;
            child.stdout?.on('data', (data: Buffer) => {
                if (data.toString().trim()) {
                    found = true;
                }
            });
            child.on('close', () => resolve(found));
            child.on('error', () => resolve(false));
        } catch {
            resolve(false);
        }
    });
}

/**
 * Detect the best available OS sandbox tool for the current platform.
 * `platform` and `probe` are injectable for tests.
 */
export async function detectSandboxExecTool(
    platform: NodeJS.Platform = process.platform,
    probe: SandboxExecToolProbe = probeSandboxExecTool
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
    return { tool: null, reason: `No OS sandbox tool available on ${platform} (need ${candidate.tools.join(' or ')}).` };
}

/**
 * Human-readable degradation notice when OS sandboxing is not supported.
 */
export function describeSandboxExecDegradation(platform: NodeJS.Platform = process.platform): string {
    if (platform === 'win32') {
        return 'OS sandbox is not supported on Windows; running under WSL2 can enable bwrap/unshare. Falling back to process-level isolation.';
    }
    if (platform === 'linux') {
        return 'OS sandbox requires bwrap or unshare on PATH. Falling back to process-level isolation.';
    }
    if (platform === 'darwin') {
        return 'OS sandbox requires sandbox-exec on PATH. Falling back to process-level isolation.';
    }
    return DEFAULT_SANDBOX_EXEC_DEGRADATION;
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
