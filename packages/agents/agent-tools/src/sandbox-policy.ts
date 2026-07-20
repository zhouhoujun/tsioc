import * as path from 'path';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from './options';

export interface ResolvedAgentToolsSandboxPolicy {
    enabled: boolean;
    maxCommandLength: number;
    allowedCommands: string[];
    blockedCommands: string[];
    inheritEnv: boolean;
    allowedEnv?: string[];
    blockedEnv: string[];
}

const DEFAULT_MAX_COMMAND_LENGTH = 4000;

export function resolveSandboxPolicy(options?: AgentToolsOptions): ResolvedAgentToolsSandboxPolicy {
    const merged = mergeAgentToolsOptions(options);
    const sandbox = merged.sandbox ?? defaultAgentToolsOptions.sandbox ?? {};
    return {
        enabled: sandbox.enabled !== false,
        maxCommandLength: sandbox.maxCommandLength ?? DEFAULT_MAX_COMMAND_LENGTH,
        allowedCommands: normalizeNames(sandbox.allowedCommands),
        blockedCommands: normalizeNames(sandbox.blockedCommands),
        inheritEnv: sandbox.inheritEnv !== false,
        allowedEnv: Array.isArray(sandbox.allowedEnv) && sandbox.allowedEnv.length
            ? uniqueStrings(sandbox.allowedEnv)
            : undefined,
        blockedEnv: uniqueStrings(sandbox.blockedEnv ?? [])
    };
}

export function assertSandboxCommand(command: string, policy: ResolvedAgentToolsSandboxPolicy, toolName: string): void {
    if (!policy.enabled) {
        return;
    }
    if (!command.trim()) {
        throw new Error(`Invalid ${toolName} command: command must be a non-empty string.`);
    }
    if (command.length > policy.maxCommandLength) {
        throw new Error(`${toolName} command exceeds the configured sandbox limit of ${policy.maxCommandLength} characters.`);
    }
    const commandName = extractCommandName(command);
    if (!commandName) {
        throw new Error(`Unable to determine the executable for ${toolName}.`);
    }
    const normalized = commandName.toLowerCase();
    if (policy.blockedCommands.includes(normalized)) {
        throw new Error(`${toolName} command '${commandName}' is blocked by sandbox policy.`);
    }
    if (policy.allowedCommands.length && !policy.allowedCommands.includes(normalized)) {
        throw new Error(`${toolName} command '${commandName}' is not allowed by sandbox policy.`);
    }
}

export function buildSandboxEnv(
    env: NodeJS.ProcessEnv | undefined,
    policy: ResolvedAgentToolsSandboxPolicy
): NodeJS.ProcessEnv {
    const source = policy.inheritEnv ? { ...(env ?? {}) } : {};
    const filtered: NodeJS.ProcessEnv = {};
    const blocked = new Set(policy.blockedEnv);
    const allowed = policy.allowedEnv ? new Set(policy.allowedEnv) : null;
    Object.keys(source).forEach(key => {
        if (allowed && !allowed.has(key)) {
            return;
        }
        if (blocked.has(key)) {
            return;
        }
        filtered[key] = source[key];
    });
    return filtered;
}

export function extractCommandName(command: string): string {
    const tokens = tokenizeCommand(command);
    for (const token of tokens) {
        if (/^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token)) {
            continue;
        }
        const cleaned = stripQuotes(token);
        if (!cleaned) {
            continue;
        }
        return path.basename(cleaned);
    }
    return '';
}

function tokenizeCommand(command: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote: '"' | '\'' | null = null;
    let escaped = false;
    for (const char of command.trim()) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            current += char;
            continue;
        }
        if (quote) {
            current += char;
            if (char === quote) {
                quote = null;
            }
            continue;
        }
        if (char === '"' || char === '\'') {
            quote = char;
            current += char;
            continue;
        }
        if (/\s/.test(char)) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }
        current += char;
    }
    if (current) {
        tokens.push(current);
    }
    return tokens;
}

function stripQuotes(value: string): string {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function normalizeNames(values: string[] | undefined): string[] {
    return uniqueStrings(values ?? []).map(value => value.toLowerCase());
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && !!value.trim()).map(value => value.trim())));
}
