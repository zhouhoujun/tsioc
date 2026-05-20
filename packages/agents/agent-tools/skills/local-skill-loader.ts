import * as fs from 'fs';
import * as path from 'path';
import globby = require('globby');
import { AgentSkillDefinition, AgentSkillToolRef, AgentSkillMetadata } from './types';

const SKILL_FILE_NAME = 'SKILL.md';
const MAX_SKILL_FILE_BYTES = 100_000;
const MAX_SKILL_FILES = 200;
const BLOCKED_SKILL_PATTERNS = [
    '/red-teaming/',
    '/mlops/inference/obliteratus/'
];
const DEFAULT_IGNORED_GLOBS = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**'];

interface ParsedFrontmatter {
    name?: string;
    description?: string;
    aliases?: string[];
    tools?: AgentSkillToolRef[];
}

export async function loadAgentSkillsFromRoots(roots: string[], metadata?: AgentSkillMetadata): Promise<AgentSkillDefinition[]> {
    const resolvedRoots = await existingDirectories(roots);
    return loadSkillsFromResolvedRoots(resolvedRoots, metadata, filePath => fs.promises.readFile(filePath, 'utf8'));
}

export function loadAgentSkillsFromRootsSync(roots: string[], metadata?: AgentSkillMetadata): AgentSkillDefinition[] {
    const resolvedRoots = existingDirectoriesSync(roots);
    return loadSkillsFromResolvedRootsSync(resolvedRoots, metadata);
}

export async function loadDefaultAgentSkills(baseDir: string, extraRoots: string[] = [], metadata?: AgentSkillMetadata): Promise<AgentSkillDefinition[]> {
    const roots = await resolveDefaultSkillRoots(baseDir, extraRoots);
    return loadAgentSkillsFromRoots(roots, metadata);
}

export async function resolveDefaultSkillRoots(baseDir: string, extraRoots: string[] = []): Promise<string[]> {
    const start = path.resolve(baseDir || process.cwd());
    const roots = new Set<string>();

    const localCandidates = [
        path.resolve(start, '../../skills'),
        path.resolve(start, '../skills')
    ];
    for (const candidate of localCandidates) {
        try {
            const stat = await fs.promises.stat(candidate);
            if (stat.isDirectory()) {
                roots.add(candidate);
                break;
            }
        } catch {
            // try next fixed candidate
        }
    }

    extraRoots.forEach(root => {
        if (root?.trim()) {
            roots.add(path.resolve(root));
        }
    });

    return Array.from(roots.values());
}

export async function loadAgentSkillFile(filePath: string, metadata?: AgentSkillMetadata, rootDir?: string): Promise<AgentSkillDefinition> {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > MAX_SKILL_FILE_BYTES) {
        throw new Error(`Skill '${filePath}' exceeds the maximum size of ${MAX_SKILL_FILE_BYTES} bytes.`);
    }
    const content = await fs.promises.readFile(filePath, 'utf8');
    return parseSkillContent(filePath, content, metadata, rootDir);
}

export function loadAgentSkillFileSync(filePath: string, metadata?: AgentSkillMetadata, rootDir?: string): AgentSkillDefinition {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_SKILL_FILE_BYTES) {
        throw new Error(`Skill '${filePath}' exceeds the maximum size of ${MAX_SKILL_FILE_BYTES} bytes.`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return parseSkillContent(filePath, content, metadata, rootDir);
}

async function existingDirectories(roots: string[]): Promise<string[]> {
    const resolved = await Promise.all(roots.map(async root => {
        try {
            const stat = await fs.promises.stat(root);
            return stat.isDirectory() ? path.resolve(root) : undefined;
        } catch {
            return undefined;
        }
    }));
    return resolved.filter((item): item is string => !!item);
}

function existingDirectoriesSync(roots: string[]): string[] {
    return roots.map(root => {
        try {
            const stat = fs.statSync(root);
            return stat.isDirectory() ? path.resolve(root) : undefined;
        } catch {
            return undefined;
        }
    }).filter((item): item is string => !!item);
}

async function loadSkillsFromResolvedRoots(
    resolvedRoots: string[],
    metadata: AgentSkillMetadata | undefined,
    readFile: (filePath: string) => Promise<string>
): Promise<AgentSkillDefinition[]> {
    const loaded = new Map<string, AgentSkillDefinition>();

    for (const root of resolvedRoots) {
        const files = await globby(`**/${SKILL_FILE_NAME}`, {
            cwd: root,
            absolute: true,
            followSymbolicLinks: false,
            ignore: DEFAULT_IGNORED_GLOBS
        });
        files.sort();
        if (files.length > MAX_SKILL_FILES) {
            throw new Error(`Skill root '${root}' exceeds the maximum of ${MAX_SKILL_FILES} skill files.`);
        }
        for (const file of files) {
            if (isBlockedSkillFile(file)) {
                continue;
            }
            const stat = await fs.promises.stat(file);
            if (stat.size > MAX_SKILL_FILE_BYTES) {
                throw new Error(`Skill '${file}' exceeds the maximum size of ${MAX_SKILL_FILE_BYTES} bytes.`);
            }
            const skill = parseSkillContent(file, await readFile(file), metadata, root);
            const existing = loaded.get(skill.id);
            if (existing) {
                throw new Error(`Duplicate skill id '${skill.id}' from '${file}' and another loaded skill.`);
            }
            loaded.set(skill.id, skill);
        }
    }

    return Array.from(loaded.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function loadSkillsFromResolvedRootsSync(resolvedRoots: string[], metadata?: AgentSkillMetadata): AgentSkillDefinition[] {
    const loaded = new Map<string, AgentSkillDefinition>();

    for (const root of resolvedRoots) {
        const files = globby.sync(`**/${SKILL_FILE_NAME}`, {
            cwd: root,
            absolute: true,
            followSymbolicLinks: false,
            ignore: DEFAULT_IGNORED_GLOBS
        }).sort();
        if (files.length > MAX_SKILL_FILES) {
            throw new Error(`Skill root '${root}' exceeds the maximum of ${MAX_SKILL_FILES} skill files.`);
        }
        for (const file of files) {
            if (isBlockedSkillFile(file)) {
                continue;
            }
            const skill = loadAgentSkillFileSync(file, metadata, root);
            const existing = loaded.get(skill.id);
            if (existing) {
                throw new Error(`Duplicate skill id '${skill.id}' from '${file}' and another loaded skill.`);
            }
            loaded.set(skill.id, skill);
        }
    }

    return Array.from(loaded.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function parseSkillContent(filePath: string, content: string, metadata?: AgentSkillMetadata, rootDir?: string): AgentSkillDefinition {
    const { frontmatter, body } = splitFrontmatter(content);
    const parsed = parseFrontmatter(frontmatter);
    const promptFull = body.trim();
    const id = normalizeValue(parsed.name) || path.basename(path.dirname(filePath));
    const mergedMetadata = mergeSkillMetadata(filePath, metadata, rootDir);
    if (!promptFull) {
        throw new Error(`Skill '${filePath}' has no body content.`);
    }
    return {
        id,
        title: extractTitle(promptFull) || id,
        summary: normalizeValue(parsed.description) || extractSummary(promptFull) || id,
        promptFull,
        aliases: parsed.aliases?.length ? parsed.aliases.slice() : undefined,
        tools: parsed.tools?.length ? parsed.tools.map(tool => ({ ...tool })) : undefined,
        metadata: mergedMetadata
    };
}

function isBlockedSkillFile(filePath: string): boolean {
    const normalized = filePath.split(path.sep).join('/');
    return BLOCKED_SKILL_PATTERNS.some(pattern => normalized.includes(pattern));
}

function splitFrontmatter(content: string): { frontmatter: string; body: string; } {
    if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
        return { frontmatter: '', body: content };
    }
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
        throw new Error('Invalid skill frontmatter: missing closing delimiter.');
    }
    return {
        frontmatter: match[1],
        body: match[2]
    };
}

function parseFrontmatter(frontmatter: string): ParsedFrontmatter {
    const result: ParsedFrontmatter = {};
    if (!frontmatter.trim()) {
        return result;
    }
    const lines = frontmatter.replace(/\r\n/g, '\n').split('\n');
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (!line || /^\s/.test(line)) {
            continue;
        }
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!match) {
            continue;
        }
        const key = match[1];
        const rawValue = match[2];
        if (rawValue === '|' || rawValue === '>') {
            const block: string[] = [];
            while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
                index++;
                block.push(lines[index].replace(/^\s+/, ''));
            }
            assignFrontmatter(result, key, rawValue === '>' ? block.join(' ') : block.join('\n'));
            continue;
        }
        assignFrontmatter(result, key, rawValue);
    }
    return result;
}

function assignFrontmatter(frontmatter: ParsedFrontmatter, key: string, rawValue: string): void {
    if (key === 'name' || key === 'description') {
        (frontmatter as any)[key] = unquote(rawValue.trim());
        return;
    }
    if (key === 'aliases') {
        frontmatter.aliases = parseRequiredStringArray(rawValue, key);
        return;
    }
    if (key === 'tools') {
        frontmatter.tools = parseRequiredStringArray(rawValue, key).map(name => ({ name }));
    }
}

function parseRequiredStringArray(rawValue: string, key: string): string[] {
    const value = rawValue.trim();
    if (!value.startsWith('[') || !value.endsWith(']')) {
        throw new Error(`Unsupported skill frontmatter for '${key}': only inline string arrays are supported.`);
    }
    return value.slice(1, -1)
        .split(',')
        .map(item => unquote(item.trim()))
        .filter(Boolean);
}

function unquote(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        return value.slice(1, -1);
    }
    return value;
}

function extractTitle(body: string): string | undefined {
    const match = body.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim();
}

function extractSummary(body: string): string | undefined {
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const collected: string[] = [];
    let started = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (started) {
                break;
            }
            continue;
        }
        if (trimmed.startsWith('#')) {
            continue;
        }
        collected.push(trimmed);
        started = true;
    }
    return collected.length ? collected.join(' ') : undefined;
}

function normalizeValue(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}

function mergeSkillMetadata(filePath: string, metadata?: AgentSkillMetadata, rootDir?: string): AgentSkillMetadata | undefined {
    const category = normalizeValue(metadata?.category) || deriveSkillCategory(filePath, rootDir);
    const source = normalizeValue(metadata?.source);
    if (!source && !category) {
        return undefined;
    }
    return {
        ...(source ? { source } : {}),
        ...(category ? { category } : {})
    };
}

function deriveSkillCategory(filePath: string, rootDir?: string): string | undefined {
    if (!rootDir) {
        return undefined;
    }
    const relative = path.relative(rootDir, filePath);
    if (!relative || relative.startsWith('..')) {
        return undefined;
    }
    const segments = relative.split(path.sep);
    if (segments.length < 2) {
        return undefined;
    }
    return normalizeValue(segments[0]);
}
