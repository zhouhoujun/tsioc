import * as fs from 'fs';
import * as path from 'path';
import { AgentSkillDefinition, AgentSkillToolRef } from './types';

interface BuiltinSkillFrontmatter {
    name?: string;
    description?: string;
    aliases?: string[];
    tools?: string[];
}

const SKILL_FILE_NAME = 'SKILL.md';
let cachedBuiltinSkills: AgentSkillDefinition[] | null = null;

export function resolveBuiltinSkillsDir(baseDir: string = __dirname): string {
    return path.resolve(baseDir, 'builtin');
}

export function loadBuiltinSkills(rootDir: string = resolveBuiltinSkillsDir()): AgentSkillDefinition[] {
    if (!fs.existsSync(rootDir)) {
        return [];
    }

    const entries = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

    return entries.map(entry => loadBuiltinSkill(path.join(rootDir, entry, SKILL_FILE_NAME), entry));
}

export function getBuiltinSkills(rootDir: string = resolveBuiltinSkillsDir()): AgentSkillDefinition[] {
    if (!cachedBuiltinSkills) {
        cachedBuiltinSkills = loadBuiltinSkills(rootDir);
    }
    return cachedBuiltinSkills.map(cloneSkill);
}

export function resetBuiltinSkillsCache(): void {
    cachedBuiltinSkills = null;
}

export async function copyBuiltinSkillAssets(outputRoot: string, sourceRoot: string = resolveBuiltinSkillsDir()): Promise<void> {
    if (!fs.existsSync(sourceRoot)) {
        return;
    }

    const destinationRoot = path.join(outputRoot, 'skills', 'builtin');
    await copyDirectory(sourceRoot, destinationRoot);
}

function loadBuiltinSkill(skillPath: string, fallbackName: string): AgentSkillDefinition {
    if (!fs.existsSync(skillPath)) {
        throw new Error(`Builtin skill file not found: ${skillPath}`);
    }
    const raw = fs.readFileSync(skillPath, 'utf8');
    const { frontmatter, body } = parseSkillDocument(raw);
    const id = normalizeSkillId(frontmatter.name || fallbackName);
    if (!id) {
        throw new Error(`Builtin skill '${skillPath}' is missing a valid name.`);
    }
    const summary = (frontmatter.description || '').trim();
    if (!summary) {
        throw new Error(`Builtin skill '${id}' is missing a description.`);
    }
    const promptFull = body.trim();
    if (!promptFull) {
        throw new Error(`Builtin skill '${id}' is empty.`);
    }

    return {
        id,
        title: extractTitle(promptFull) || toTitleCase(id),
        summary,
        promptFull,
        aliases: frontmatter.aliases?.map(alias => normalizeSkillId(alias)).filter(Boolean) as string[] | undefined,
        tools: toToolRefs(frontmatter.tools)
    };
}

function parseSkillDocument(raw: string): { frontmatter: BuiltinSkillFrontmatter; body: string; } {
    if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
        return { frontmatter: {}, body: raw };
    }

    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
        throw new Error('Invalid builtin skill frontmatter: missing closing delimiter.');
    }

    return {
        frontmatter: parseFrontmatter(match[1]),
        body: match[2]
    };
}

function parseFrontmatter(block: string): BuiltinSkillFrontmatter {
    const result: BuiltinSkillFrontmatter = {};
    const lines = block.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
            continue;
        }
        const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
        if (!match) {
            continue;
        }

        const [, key, rawValue] = match;
        if (rawValue) {
            assignFrontmatterValue(result, key, parseScalarOrInlineArray(rawValue));
            continue;
        }

        const nested: string[] = [];
        while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
            nested.push(lines[++i]);
        }
        assignFrontmatterValue(result, key, parseIndentedBlock(nested));
    }

    return result;
}

function assignFrontmatterValue(target: BuiltinSkillFrontmatter, key: string, value: string | string[]): void {
    if (key === 'name' || key === 'description') {
        if (typeof value === 'string') {
            target[key] = value;
        }
        return;
    }
    if (key === 'aliases' || key === 'tools') {
        target[key] = Array.isArray(value) ? value : [value];
    }
}

function parseScalarOrInlineArray(value: string): string | string[] {
    const trimmed = stripQuotes(value.trim());
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return trimmed.slice(1, -1)
            .split(',')
            .map(item => stripQuotes(item.trim()))
            .filter(Boolean);
    }
    return trimmed;
}

function parseIndentedBlock(lines: string[]): string | string[] {
    const items = lines
        .map(line => line.trim())
        .filter(Boolean);
    if (items.every(line => line.startsWith('- '))) {
        return items.map(line => stripQuotes(line.slice(2).trim())).filter(Boolean);
    }
    return items.map(item => stripQuotes(item)).join('\n');
}

function stripQuotes(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}

function normalizeSkillId(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function extractTitle(promptFull: string): string | undefined {
    const match = /^#\s+(.+)$/m.exec(promptFull);
    return match ? match[1].trim() : undefined;
}

function toTitleCase(value: string): string {
    return value
        .split('-')
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

function toToolRefs(tools?: string[]): AgentSkillToolRef[] | undefined {
    const values = tools?.map(tool => tool.trim()).filter(Boolean);
    return values?.length ? values.map(name => ({ name })) : undefined;
}

function cloneSkill(skill: AgentSkillDefinition): AgentSkillDefinition {
    return {
        ...skill,
        aliases: skill.aliases ? skill.aliases.slice() : undefined,
        tools: skill.tools ? skill.tools.map(tool => ({ ...tool })) : undefined
    };
}

async function copyDirectory(sourceDir: string, destinationDir: string): Promise<void> {
    await fs.promises.mkdir(destinationDir, { recursive: true });
    const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destinationPath = path.join(destinationDir, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, destinationPath);
            continue;
        }
        if (entry.isFile()) {
            await fs.promises.copyFile(sourcePath, destinationPath);
        }
    }
}
