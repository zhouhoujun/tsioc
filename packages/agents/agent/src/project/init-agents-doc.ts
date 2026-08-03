import { FileAdapter, FileDirectoryEntry } from '@tsdi/common';
import { basenameAgentPath } from '../AgentWorkspacePath';
import { DEFAULT_AGENTS_DOC_NAME, findProjectRoot } from './agents-doc';

/**
 * AGENTS.md generator backing the `/init` command.
 *
 * Analyzes the project structure and writes a concise draft AGENTS.md that
 * AI agents can use as project context. The generated file is a starting
 * point — edit it to match the project's real conventions.
 */

export interface ProjectStructureSummary {
    root: string;
    name: string;
    description?: string;
    readme?: string;
    languages: string[];
    topLevelDirs: string[];
    topLevelFiles: string[];
    buildCommands: string[];
    vcs: 'git' | 'none';
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript / React',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript / React',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.kts': 'Kotlin',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.hpp': 'C++',
    '.c': 'C',
    '.h': 'C',
    '.dart': 'Dart',
    '.vue': 'Vue',
    '.sol': 'Solidity'
};

const KEY_FILE_PATTERN = /^(README|package\.json|tsconfig(\.\w+)?\.json|taskfile(\.ts|\.js)?|Makefile|go\.mod|Cargo\.toml|pom\.xml|build\.gradle|composer\.json|requirements\.txt|pyproject\.toml|Gemfile|mix\.exs)$/i;

const SCRIPT_PREFERENCE = ['build', 'test', 'lint', 'typecheck', 'check', 'task', 'dev', 'start'];

interface PackageJsonInfo {
    name?: string;
    description?: string;
    scripts?: Record<string, string>;
}

interface InitAgentsDocIo {
    resolve(...paths: string[]): string;
    join(...paths: string[]): string;
    extname(path: string): string;
    existsSync(path: string): boolean;
    readTextSync(path: string): string;
    listSync(path: string): FileDirectoryEntry[];
    writeText(path: string, content: string): Promise<void>;
}

function tryLoadNodeIo(): InitAgentsDocIo | null {
    try {
        const req = typeof require === 'function' ? require : null;
        if (!req) {
            return null;
        }
        const fs = req('fs');
        const path = req('path');
        return {
            resolve: (...paths: string[]) => path.resolve(...paths),
            join: (...paths: string[]) => path.join(...paths),
            extname: (target: string) => path.extname(target),
            existsSync: (target: string) => fs.existsSync(target),
            readTextSync: (target: string) => fs.readFileSync(target, 'utf8'),
            listSync: (target: string) => {
                const entries = fs.readdirSync(target, { withFileTypes: true });
                return entries.map((entry: any) => ({
                    name: entry.name,
                    path: path.join(target, entry.name),
                    kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
                }));
            },
            writeText: async (target: string, content: string) => {
                await fs.promises.writeFile(target, content, 'utf8');
            }
        };
    } catch {
        return null;
    }
}

function adaptFileAdapter(adapter: FileAdapter, writeText?: (path: string, content: string) => Promise<void>): InitAgentsDocIo {
    return {
        resolve: (...paths: string[]) => adapter.resolve(...paths),
        join: (...paths: string[]) => adapter.join(...paths),
        extname: (target: string) => adapter.extname(target),
        existsSync: (target: string) => adapter.existsSync(target),
        readTextSync: (target: string) => adapter.readTextSync(target),
        listSync: () => [],
        writeText: writeText ?? (async () => {
            throw new Error('Writing AGENTS.md is not supported in this environment.');
        })
    };
}

function readPackageJson(root: string, io: InitAgentsDocIo): PackageJsonInfo | null {
    try {
        const parsed = JSON.parse(io.readTextSync(io.join(root, 'package.json')));
        return {
            name: typeof parsed.name === 'string' ? parsed.name : undefined,
            description: typeof parsed.description === 'string' ? parsed.description : undefined,
            scripts: parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : undefined
        };
    } catch {
        return null;
    }
}

function collectExtensions(dir: string, depth: number, maxFiles: number, io: InitAgentsDocIo): string[] {
    if (depth <= 0 || maxFiles <= 0) {
        return [];
    }
    const entries = io.listSync(dir);
    const extensions: string[] = [];
    for (const entry of entries) {
        if (extensions.length >= maxFiles) {
            break;
        }
        if (entry.kind === 'directory') {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                continue;
            }
            extensions.push(...collectExtensions(entry.path, depth - 1, maxFiles - extensions.length, io));
        } else if (entry.kind === 'file') {
            const ext = io.extname(entry.name).toLowerCase();
            if (LANGUAGE_BY_EXTENSION[ext]) {
                extensions.push(ext);
            }
        }
    }
    return extensions;
}

export function analyzeProjectStructure(root: string, io: InitAgentsDocIo = tryLoadNodeIo()!): ProjectStructureSummary {
    const entries = io?.listSync(root) ?? [];
    const topLevelDirs: string[] = [];
    const topLevelFiles: string[] = [];
    for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.github') {
            continue;
        }
        if (entry.kind === 'directory') {
            topLevelDirs.push(entry.name);
        } else if (entry.kind === 'file') {
            topLevelFiles.push(entry.name);
        }
    }

    const pkg = io ? readPackageJson(root, io) : null;

    const languages: string[] = [];
    for (const ext of new Set(io ? collectExtensions(root, 3, 300, io) : [])) {
        const language = LANGUAGE_BY_EXTENSION[ext];
        if (language && !languages.includes(language)) {
            languages.push(language);
        }
    }

    const buildCommands: string[] = [];
    if (pkg?.scripts) {
        for (const script of SCRIPT_PREFERENCE) {
            if (pkg.scripts[script] !== undefined) {
                buildCommands.push(`- \`npm run ${script}\``);
            }
        }
    }

    const readme = topLevelFiles.find(f => /^README(\.md|\.markdown|\.txt)?$/i.test(f));

    return {
        root,
        name: pkg?.name ?? basenameAgentPath(root),
        description: pkg?.description,
        readme,
        languages,
        topLevelDirs,
        topLevelFiles,
        buildCommands,
        vcs: io?.existsSync(io.join(root, '.git')) ? 'git' : 'none'
    };
}

export function buildAgentsMdDraft(summary: ProjectStructureSummary): string {
    const lines: string[] = [];
    lines.push(`# ${summary.name}`);
    lines.push('');
    if (summary.description) {
        lines.push(summary.description);
        lines.push('');
    }
    lines.push('## Project Overview');
    lines.push('');
    lines.push(`This file provides AI agents with project context for ${summary.name}. Keep it concise and current.`);
    lines.push('');
    lines.push('## Tech Stack');
    lines.push('');
    if (summary.languages.length) {
        for (const language of summary.languages) {
            lines.push(`- ${language}`);
        }
    } else {
        lines.push('- (not detected)');
    }
    lines.push('');
    lines.push('## Key Commands');
    lines.push('');
    if (summary.buildCommands.length) {
        lines.push(...summary.buildCommands);
    } else {
        lines.push('- (no package scripts detected)');
    }
    lines.push('');
    lines.push('## Project Structure');
    lines.push('');
    if (summary.topLevelDirs.length) {
        lines.push('Directories:');
        for (const dir of summary.topLevelDirs.slice(0, 20)) {
            lines.push(`- ${dir}/`);
        }
    }
    const keyFiles = summary.topLevelFiles.filter(f => KEY_FILE_PATTERN.test(f)).slice(0, 20);
    if (keyFiles.length) {
        lines.push('Key files:');
        for (const file of keyFiles) {
            lines.push(`- ${file}`);
        }
    }
    if (summary.readme) {
        lines.push('');
        lines.push(`See ${summary.readme} for full project documentation.`);
    }
    lines.push('');
    lines.push('## Development Notes');
    lines.push('');
    lines.push('- Update this file when the project structure or commands change.');
    lines.push('');
    return lines.join('\n');
}

export interface InitAgentsDocOptions {
    root?: string;
    fileName?: string;
    force?: boolean;
    fileAdapter?: FileAdapter;
    writeText?: (path: string, content: string) => Promise<void>;
}

export interface InitAgentsDocResult {
    file: string;
    created: boolean;
    reason?: string;
    draft?: string;
}

export async function initAgentsDoc(options: InitAgentsDocOptions = {}): Promise<InitAgentsDocResult> {
    const io = options.fileAdapter
        ? adaptFileAdapter(options.fileAdapter, options.writeText)
        : tryLoadNodeIo();
    if (!io) {
        return { file: options.fileName ?? DEFAULT_AGENTS_DOC_NAME, created: false, reason: 'filesystem access is not available in this environment' };
    }
    const fileName = options.fileName ?? DEFAULT_AGENTS_DOC_NAME;
    const startDir = io.resolve(options.root ?? '.');
    const projectRoot = findProjectRoot(startDir, { stopAt: startDir, exists: io.existsSync }) ?? startDir;
    const target = io.join(projectRoot, fileName);
    if (io.existsSync(target) && !options.force) {
        return { file: target, created: false, reason: `already exists at ${target}; use --force to overwrite` };
    }
    const draft = buildAgentsMdDraft(analyzeProjectStructure(projectRoot, io));
    await io.writeText(target, draft);
    return { file: target, created: true, draft };
}
