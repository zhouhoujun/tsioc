import { spawn } from 'child_process';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export const AGENT_CLI_PACKAGE_NAME = '@tsdi/agent-cli';
export const SUPPORTED_UPDATE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
export const AGENT_UPDATE_STATUSES = ['update_available', 'up_to_date', 'current_newer_than_target', 'target_not_found'] as const;

export type AgentCliUpdateManager = (typeof SUPPORTED_UPDATE_MANAGERS)[number];
export type AgentCliUpdateStatus = (typeof AGENT_UPDATE_STATUSES)[number];

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
    status?: AgentCliUpdateStatus;
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
        ...(plan.status ? [`Status: ${formatAgentUpdateStatus(plan.status)}`] : []),
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
        const status = resolveAgentUpdateStatus(plan.currentVersion, latestVersion);
        plan.status = status;
        plan.updateAvailable = status === 'update_available';
    }

    if (options.json) {
        stdout.write(JSON.stringify(plan, null, 2) + '\n');
    } else {
        stdout.write(formatAgentUpdatePlan(plan) + '\n');
    }

    if (!options.yes) {
        return plan;
    }

    if (plan.status === 'up_to_date') {
        stdout.write('Already up to date; skipping install.\n');
        return plan;
    }

    if (plan.status === 'current_newer_than_target') {
        stdout.write('Current version is newer than the checked target; skipping install.\n');
        return plan;
    }

    if (plan.status === 'target_not_found') {
        stdout.write('Checked target was not found in the registry metadata; skipping install.\n');
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

export function resolveAgentUpdateStatus(currentVersion: string, latestVersion?: string | null): AgentCliUpdateStatus {
    const normalizedLatest = String(latestVersion || '').trim();
    if (!normalizedLatest) {
        return 'target_not_found';
    }

    const comparison = compareSemanticVersions(currentVersion, normalizedLatest);
    if (comparison === null) {
        return normalizedLatest === String(currentVersion || '').trim()
            ? 'up_to_date'
            : 'update_available';
    }

    if (comparison === 0) {
        return 'up_to_date';
    }
    return comparison < 0 ? 'update_available' : 'current_newer_than_target';
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

function formatAgentUpdateStatus(status: AgentCliUpdateStatus): string {
    switch (status) {
        case 'update_available':
            return 'update available';
        case 'up_to_date':
            return 'up to date';
        case 'current_newer_than_target':
            return 'current version is newer than target';
        case 'target_not_found':
            return 'target version not found';
    }
}

function compareSemanticVersions(left: string, right: string): number | null {
    const leftVersion = parseSemanticVersion(left);
    const rightVersion = parseSemanticVersion(right);
    if (!leftVersion || !rightVersion) {
        return null;
    }

    const coreDelta = compareNumber(leftVersion.major, rightVersion.major)
        || compareNumber(leftVersion.minor, rightVersion.minor)
        || compareNumber(leftVersion.patch, rightVersion.patch);
    if (coreDelta !== 0) {
        return coreDelta;
    }

    return comparePrereleaseIdentifiers(leftVersion.prerelease, rightVersion.prerelease);
}

function parseSemanticVersion(value: string): { major: number; minor: number; patch: number; prerelease: string[] } | null {
    const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
    if (!match) {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] ? match[4].split('.').filter(Boolean) : []
    };
}

function comparePrereleaseIdentifiers(left: string[], right: string[]): number {
    if (!left.length && !right.length) {
        return 0;
    }
    if (!left.length) {
        return 1;
    }
    if (!right.length) {
        return -1;
    }

    const max = Math.max(left.length, right.length);
    for (let index = 0; index < max; index++) {
        const leftPart = left[index];
        const rightPart = right[index];
        if (leftPart === undefined) {
            return -1;
        }
        if (rightPart === undefined) {
            return 1;
        }
        const delta = comparePrereleasePart(leftPart, rightPart);
        if (delta !== 0) {
            return delta;
        }
    }
    return 0;
}

function comparePrereleasePart(left: string, right: string): number {
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
        return compareNumber(Number(left), Number(right));
    }
    if (leftNumeric) {
        return -1;
    }
    if (rightNumeric) {
        return 1;
    }
    return left.localeCompare(right);
}

function compareNumber(left: number, right: number): number {
    return left === right ? 0 : left < right ? -1 : 1;
}

function readAgentCliVersion(): string {
    try {
        const pkg = require('../package.json');
        return String(pkg?.version || 'unknown');
    } catch {
        return 'unknown';
    }
}
