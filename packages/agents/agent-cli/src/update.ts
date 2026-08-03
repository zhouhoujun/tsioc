import { spawn } from 'child_process';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

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
    registry?: string;
    latestVersion?: string | null;
    updateAvailable?: boolean;
}

export interface AgentCliUpdateOptions {
    manager?: string;
    target?: string;
    registry?: string;
    check?: boolean;
    yes?: boolean;
    json?: boolean;
}

export interface AgentCliUpdateIo {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdout?: { write(chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void): boolean };
    stderr?: { write(chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void): boolean };
    runner?: (command: string, argv: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv }) => Promise<number>;
    metadataFetcher?: (packageName: string, registry: string) => Promise<AgentCliRegistryMetadata>;
}

interface AgentCliRegistryMetadata {
    'dist-tags'?: Record<string, string>;
    versions?: Record<string, unknown>;
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

export function resolveAgentUpdateRegistry(registry?: string | null, env: NodeJS.ProcessEnv = process.env): string {
    const raw = String(registry || env.npm_config_registry || 'https://registry.npmjs.org').trim();
    const normalized = raw.replace(/\/+$/, '');
    return normalized || 'https://registry.npmjs.org';
}

export function formatAgentUpdatePlan(plan: AgentCliUpdatePlan): string {
    const lines = [
        'Agent CLI update',
        `Current: ${plan.currentVersion}`,
        `Target: ${plan.target}`,
        `Manager: ${plan.manager}`,
        ...(plan.registry ? [`Registry: ${plan.registry}`] : []),
        ...(plan.latestVersion ? [`Latest: ${plan.latestVersion}`] : []),
        ...(typeof plan.updateAvailable === 'boolean'
            ? [`Status: ${plan.updateAvailable ? 'update available' : 'up to date'}`]
            : []),
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

    if (options.check) {
        const registry = resolveAgentUpdateRegistry(options.registry, env);
        const latestVersion = await resolveAgentCliLatestVersion(plan.target, registry, io.metadataFetcher);
        plan.registry = registry;
        plan.latestVersion = latestVersion;
        plan.updateAvailable = latestVersion ? latestVersion !== plan.currentVersion : undefined;
    }

    if (options.json) {
        stdout.write(JSON.stringify(plan, null, 2) + '\n');
    } else {
        stdout.write(formatAgentUpdatePlan(plan) + '\n');
    }

    if (!options.yes) {
        return plan;
    }

    if (plan.updateAvailable === false) {
        stdout.write('Already up to date; skipping install.\n');
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

async function resolveAgentCliLatestVersion(
    target: string,
    registry: string,
    metadataFetcher: AgentCliUpdateIo['metadataFetcher']
): Promise<string | null> {
    const metadata = await (metadataFetcher || defaultAgentCliMetadataFetcher)(AGENT_CLI_PACKAGE_NAME, registry);
    const tags = metadata['dist-tags'] || {};
    const versions = metadata.versions || {};
    if (target === 'latest') {
        return String(tags.latest || '').trim() || null;
    }
    if (tags[target]) {
        return String(tags[target] || '').trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(versions, target)) {
        return target;
    }
    return null;
}

function defaultAgentCliMetadataFetcher(packageName: string, registry: string): Promise<AgentCliRegistryMetadata> {
    const endpoint = `${registry}/${encodeURIComponent(packageName)}`;
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint);
        const transport = url.protocol === 'http:' ? http : https;
        const req = transport.get(url, {
            headers: {
                accept: 'application/json'
            }
        }, response => {
            const statusCode = response.statusCode || 0;
            if (statusCode < 200 || statusCode >= 300) {
                response.resume();
                reject(new Error(`Failed to query registry metadata: HTTP ${statusCode}`));
                return;
            }
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
                body += chunk;
            });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        });
        req.on('error', reject);
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
