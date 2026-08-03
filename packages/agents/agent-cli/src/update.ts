import { spawn } from 'child_process';

export const AGENT_CLI_PACKAGE_NAME = '@tsdi/agent-cli';
export const SUPPORTED_UPDATE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;

export type AgentCliUpdateManager = (typeof SUPPORTED_UPDATE_MANAGERS)[number];

export interface AgentCliUpdatePlan {
    packageName: string;
    currentVersion: string;
    target: string;
    manager: AgentCliUpdateManager;
    command: string;
    argv: string[];
}

export interface AgentCliUpdateOptions {
    manager?: string;
    target?: string;
    yes?: boolean;
    json?: boolean;
}

export interface AgentCliUpdateIo {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdout?: { write(chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void): boolean };
    stderr?: { write(chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void): boolean };
    runner?: (command: string, argv: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv }) => Promise<number>;
}

export function resolveAgentUpdateManager(manager?: string | null, env: NodeJS.ProcessEnv = process.env): AgentCliUpdateManager {
    const explicit = String(manager || '').trim().toLowerCase();
    if (explicit) {
        if ((SUPPORTED_UPDATE_MANAGERS as readonly string[]).includes(explicit)) {
            return explicit as AgentCliUpdateManager;
        }
        throw new Error(`Unsupported package manager: ${manager}. Expected one of ${SUPPORTED_UPDATE_MANAGERS.join(', ')}.`);
    }

    const userAgent = String(env.npm_config_user_agent || '').trim().toLowerCase();
    for (const candidate of SUPPORTED_UPDATE_MANAGERS) {
        if (userAgent.startsWith(`${candidate}/`)) {
            return candidate;
        }
    }
    return 'npm';
}

export function createAgentUpdatePlan(options: AgentCliUpdateOptions = {}, env: NodeJS.ProcessEnv = process.env): AgentCliUpdatePlan {
    const manager = resolveAgentUpdateManager(options.manager, env);
    const target = String(options.target || 'latest').trim() || 'latest';
    const packageName = `${AGENT_CLI_PACKAGE_NAME}@${target}`;
    const argv = buildAgentUpdateArgv(manager, packageName);
    return {
        packageName: AGENT_CLI_PACKAGE_NAME,
        currentVersion: readAgentCliVersion(),
        target,
        manager,
        argv,
        command: [manager, ...argv].join(' ')
    };
}

export function formatAgentUpdatePlan(plan: AgentCliUpdatePlan): string {
    const lines = [
        'Agent CLI update',
        `Current: ${plan.currentVersion}`,
        `Target: ${plan.target}`,
        `Manager: ${plan.manager}`,
        `Command: ${plan.command}`,
        'Run with --yes to execute the update automatically.'
    ];
    return lines.join('\n');
}

export async function runAgentUpdate(options: AgentCliUpdateOptions = {}, io: AgentCliUpdateIo = {}): Promise<AgentCliUpdatePlan> {
    const stdout = io.stdout || process.stdout;
    const stderr = io.stderr || process.stderr;
    const env = io.env || process.env;
    const plan = createAgentUpdatePlan(options, env);

    if (options.json) {
        stdout.write(JSON.stringify(plan, null, 2) + '\n');
    } else {
        stdout.write(formatAgentUpdatePlan(plan) + '\n');
    }

    if (!options.yes) {
        return plan;
    }

    const exitCode = await (io.runner || defaultAgentUpdateRunner)(plan.manager, plan.argv, {
        cwd: io.cwd,
        env
    });
    if (exitCode !== 0) {
        stderr.write(`Update command exited with code ${exitCode}.\n`);
        process.exitCode = exitCode;
    }
    return plan;
}

function buildAgentUpdateArgv(manager: AgentCliUpdateManager, packageName: string): string[] {
    switch (manager) {
        case 'npm':
            return ['install', '-g', packageName];
        case 'pnpm':
            return ['add', '-g', packageName];
        case 'yarn':
            return ['global', 'add', packageName];
        case 'bun':
            return ['add', '-g', packageName];
    }
}

function defaultAgentUpdateRunner(command: string, argv: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv }): Promise<number> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, argv, {
            cwd: options.cwd,
            env: options.env,
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });
        child.on('error', reject);
        child.on('exit', code => resolve(code ?? 1));
    });
}

function readAgentCliVersion(): string {
    try {
        const pkg = require('../package.json');
        return String(pkg?.version || 'unknown');
    } catch {
        return 'unknown';
    }
}
