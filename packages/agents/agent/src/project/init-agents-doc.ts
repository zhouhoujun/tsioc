import { Dirent, existsSync, readdirSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';
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

function readPackageJson(root: string): PackageJsonInfo | null {
    try {
        const parsed = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
        return {
            name: typeof parsed.name === 'string' ? parsed.name : undefined,
            description: typeof parsed.description === 'string' ? parsed.description : undefined,
            scripts: parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : undefined
        };
    } catch {
        return null;
    }
}

function collectExtensions(dir: string, depth: number, maxFiles: number): string[] {
    if (depth <= 0 || maxFiles <= 0) {
        return [];
    }
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    const extensions: string[] = [];
    for (const entry of entries) {
        if (extensions.length >= maxFiles) {
            break;
        }
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                continue;
            }
            extensions.push(...collectExtensions(join(dir, entry.name), depth - 1, maxFiles - extensions.length));
        } else if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase();
            if (LANGUAGE_BY_EXTENSION[ext]) {
                extensions.push(ext);
            }
        }
    }
    return extensions;
}

export function analyzeProjectStructure(root: string): ProjectStructureSummary {
    let entries: Dirent[] = [];
    try {
        entries = readdirSync(root, { withFileTypes: true });
    } catch {
        entries = [];
    }
    const topLevelDirs: string[] = [];
    const topLevelFiles: string[] = [];
    for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.github') {
            continue;
        }
        if (entry.isDirectory()) {
            topLevelDirs.push(entry.name);
        } else if (entry.isFile()) {
            topLevelFiles.push(entry.name);
        }
    }

    const pkg = readPackageJson(root);

    const languages: string[] = [];
    for (const ext of new Set(collectExtensions(root, 3, 300))) {
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
        name: pkg?.name ?? basename(root),
        description: pkg?.description,
        readme,
        languages,
        topLevelDirs,
        topLevelFiles,
        buildCommands,
        vcs: existsSync(join(root, '.git')) ? 'git' : 'none'
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
}

export interface InitAgentsDocResult {
    file: string;
    created: boolean;
    reason?: string;
    draft?: string;
}

export async function initAgentsDoc(options: InitAgentsDocOptions = {}): Promise<InitAgentsDocResult> {
    const fileName = options.fileName ?? DEFAULT_AGENTS_DOC_NAME;
    const startDir = resolve(options.root ?? process.cwd());
    const projectRoot = findProjectRoot(startDir) ?? startDir;
    const target = join(projectRoot, fileName);
    if (existsSync(target) && !options.force) {
        return { file: target, created: false, reason: `already exists at ${target}; use --force to overwrite` };
    }
    const draft = buildAgentsMdDraft(analyzeProjectStructure(projectRoot));
    await writeFile(target, draft, 'utf8');
    return { file: target, created: true, draft };
}
