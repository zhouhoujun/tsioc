import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { Injectable, Optional } from '@tsdi/ioc';
import { loadAgentSkillsFromRootsSync } from './local-skill-loader';
import { AgentSkillDefinition, InstalledRemoteSkill, RemoteSkillSource } from './types';

const METADATA_FILE = '.remote-skill.json';
const GIT_TIMEOUT_MS = 120_000;
const FETCH_TIMEOUT_MS = 30_000;

export interface RemoteSkillProcessResult {
    code: number;
    stdout: string;
    stderr: string;
}

export interface RemoteSkillProcessRunner {
    run(command: string, args: string[], options?: { cwd?: string; timeoutMs?: number; }): Promise<RemoteSkillProcessResult>;
    fetchText(url: string, timeoutMs?: number): Promise<string>;
}

class NodeRemoteSkillProcessRunner implements RemoteSkillProcessRunner {
    run(command: string, args: string[], options?: { cwd?: string; timeoutMs?: number; }): Promise<RemoteSkillProcessResult> {
        return new Promise<RemoteSkillProcessResult>(resolve => {
            execFile(command, args, {
                cwd: options?.cwd,
                timeout: options?.timeoutMs ?? GIT_TIMEOUT_MS,
                maxBuffer: 4 * 1024 * 1024,
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo' }
            }, (error, stdout, stderr) => {
                if (error) {
                    const code = typeof (error as any).code === 'number' ? (error as any).code : 1;
                    resolve({ code, stdout: String(stdout || ''), stderr: String(stderr || error.message || '') });
                    return;
                }
                resolve({ code: 0, stdout: String(stdout || ''), stderr: String(stderr || '') });
            });
        });
    }

    async fetchText(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<string> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await globalThis.fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
            }
            return await response.text();
        } finally {
            clearTimeout(timer);
        }
    }
}

interface RemoteSkillManifest {
    version?: string;
    skills?: Array<{ name?: string; description?: string; aliases?: string[]; tools?: string[]; prompt?: string; }>;
}

function skillId(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function cloneRemoteSkill(installed: InstalledRemoteSkill): InstalledRemoteSkill {
    return {
        ...installed,
        skillIds: installed.skillIds.slice()
    };
}

/**
 * Installs, updates, lists, and removes skills from remote sources (git
 * repositories or registry manifests), with version tracking and conflict
 * detection against already-registered skills.
 */
@Injectable()
export class RemoteSkillManager {
    private defaultRunner = new NodeRemoteSkillProcessRunner();

    constructor(
        @Optional() private runner?: RemoteSkillProcessRunner | null
    ) {
    }

    private processRunner(): RemoteSkillProcessRunner {
        return this.runner ?? this.defaultRunner;
    }

    defaultCacheDir(): string {
        return path.join(os.homedir(), '.tsdi-agent', 'skills');
    }

    async install(source: RemoteSkillSource, cacheDir: string, existing: AgentSkillDefinition[] = [], force = false): Promise<InstalledRemoteSkill> {
        const destDir = this.destinationFor(source.id, cacheDir);
        if (fs.existsSync(destDir)) {
            throw new Error(`Remote skill '${source.id}' is already installed at '${destDir}'. Use update() instead.`);
        }
        fs.mkdirSync(destDir, { recursive: true });
        try {
            if (source.type === 'git') {
                await this.cloneGitSource(source, destDir);
            } else {
                await this.materializeRegistrySource(source, destDir);
            }
            const skills = this.loadInstalledSkills(destDir);
            const conflicts = this.detectConflicts(skills, existing);
            if (conflicts.length > 0 && !force) {
                throw new Error(`Remote skill '${source.id}' conflicts with existing skills: ${conflicts.join(', ')}. Pass force=true to override.`);
            }
            const version = await this.resolveVersion(source, destDir);
            const installed: InstalledRemoteSkill = {
                id: source.id,
                type: source.type,
                url: source.url,
                ...(source.ref ? { ref: source.ref } : {}),
                ...(version ? { version } : {}),
                installedAt: Date.now(),
                skillIds: skills.map(skill => skill.id)
            };
            this.writeMetadata(destDir, installed);
            return cloneRemoteSkill(installed);
        } catch (err) {
            fs.rmSync(destDir, { recursive: true, force: true });
            throw err;
        }
    }

    async update(source: RemoteSkillSource, cacheDir: string): Promise<InstalledRemoteSkill> {
        const destDir = this.destinationFor(source.id, cacheDir);
        if (!fs.existsSync(destDir)) {
            throw new Error(`Remote skill '${source.id}' is not installed. Use install() first.`);
        }
        if (source.type === 'git') {
            await this.updateGitSource(source, destDir);
        } else {
            await this.materializeRegistrySource(source, destDir);
        }
        const skills = this.loadInstalledSkills(destDir);
        const version = await this.resolveVersion(source, destDir);
        const installed: InstalledRemoteSkill = {
            id: source.id,
            type: source.type,
            url: source.url,
            ...(source.ref ? { ref: source.ref } : {}),
            ...(version ? { version } : {}),
            installedAt: this.readMetadata(destDir)?.installedAt ?? Date.now(),
            skillIds: skills.map(skill => skill.id)
        };
        this.writeMetadata(destDir, installed);
        return cloneRemoteSkill(installed);
    }

    list(cacheDir: string): InstalledRemoteSkill[] {
        if (!fs.existsSync(cacheDir)) {
            return [];
        }
        return fs.readdirSync(cacheDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => this.readMetadata(path.join(cacheDir, entry.name)))
            .filter((installed): installed is InstalledRemoteSkill => !!installed)
            .sort((left, right) => left.id.localeCompare(right.id));
    }

    remove(id: string, cacheDir: string): boolean {
        const destDir = this.destinationFor(id, cacheDir);
        if (!fs.existsSync(destDir)) {
            return false;
        }
        fs.rmSync(destDir, { recursive: true, force: true });
        return true;
    }

    detectConflicts(candidates: AgentSkillDefinition[], existing: AgentSkillDefinition[]): string[] {
        const existingIds = new Set(existing.map(skill => skill.id.toLowerCase()));
        return candidates
            .map(skill => skill.id)
            .filter(id => existingIds.has(id.toLowerCase()));
    }

    loadInstalledSkills(destDir: string): AgentSkillDefinition[] {
        return loadAgentSkillsFromRootsSync([destDir], { source: 'remote' });
    }

    private async cloneGitSource(source: RemoteSkillSource, destDir: string): Promise<void> {
        const args = ['clone', '--depth', '1'];
        if (source.ref) {
            args.push('--branch', source.ref);
        }
        args.push(source.url, destDir);
        const result = await this.processRunner().run('git', args, { timeoutMs: GIT_TIMEOUT_MS });
        if (result.code !== 0) {
            throw new Error(`git clone failed: ${result.stderr || result.stdout}`);
        }
    }

    private async updateGitSource(source: RemoteSkillSource, destDir: string): Promise<void> {
        if (source.ref) {
            const fetch = await this.processRunner().run('git', ['fetch', 'origin', source.ref], { cwd: destDir });
            if (fetch.code !== 0) {
                throw new Error(`git fetch failed: ${fetch.stderr || fetch.stdout}`);
            }
            const reset = await this.processRunner().run('git', ['reset', '--hard', 'FETCH_HEAD'], { cwd: destDir });
            if (reset.code !== 0) {
                throw new Error(`git reset failed: ${reset.stderr || reset.stdout}`);
            }
            return;
        }
        const pull = await this.processRunner().run('git', ['pull', '--ff-only'], { cwd: destDir });
        if (pull.code !== 0) {
            throw new Error(`git pull failed: ${pull.stderr || pull.stdout}`);
        }
    }

    private async materializeRegistrySource(source: RemoteSkillSource, destDir: string): Promise<void> {
        fs.rmSync(destDir, { recursive: true, force: true });
        fs.mkdirSync(destDir, { recursive: true });
        const manifest = await this.parseManifest(source);
        const skills = manifest.skills ?? [];
        if (skills.length === 0) {
            throw new Error(`Registry '${source.id}' declares no skills.`);
        }
        for (const entry of skills) {
            const id = skillId(entry.name || '');
            if (!id || !entry.prompt?.trim()) {
                continue;
            }
            const skillDir = path.join(destDir, id);
            fs.mkdirSync(skillDir, { recursive: true });
            const frontmatter = this.buildFrontmatter(entry);
            fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `${frontmatter}\n${entry.prompt.trim()}\n`, 'utf8');
        }
    }

    private async parseManifest(source: RemoteSkillSource): Promise<RemoteSkillManifest> {
        const text = await this.processRunner().fetchText(source.url, FETCH_TIMEOUT_MS);
        try {
            return JSON.parse(text) as RemoteSkillManifest;
        } catch (err) {
            throw new Error(`Registry '${source.id}' returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private buildFrontmatter(entry: NonNullable<RemoteSkillManifest['skills']>[number]): string {
        const lines: string[] = ['---'];
        if (entry.name) {
            lines.push(`name: ${entry.name}`);
        }
        if (entry.description) {
            lines.push(`description: ${entry.description}`);
        }
        if (entry.aliases?.length) {
            lines.push(`aliases: [${entry.aliases.map(alias => `"${alias}"`).join(', ')}]`);
        }
        if (entry.tools?.length) {
            lines.push(`tools: [${entry.tools.map(tool => `"${tool}"`).join(', ')}]`);
        }
        lines.push('---');
        return lines.join('\n');
    }

    private async resolveVersion(source: RemoteSkillSource, destDir: string): Promise<string | undefined> {
        if (source.type === 'registry') {
            try {
                const manifest = await this.parseManifest(source);
                return manifest.version || source.version;
            } catch {
                return source.version;
            }
        }
        const tag = await this.processRunner().run('git', ['describe', '--tags', '--abbrev=0'], { cwd: destDir, timeoutMs: 10_000 });
        if (tag.code === 0 && tag.stdout.trim()) {
            return tag.stdout.trim();
        }
        const hash = await this.processRunner().run('git', ['rev-parse', '--short', 'HEAD'], { cwd: destDir, timeoutMs: 10_000 });
        return hash.code === 0 && hash.stdout.trim() ? hash.stdout.trim() : undefined;
    }

    private destinationFor(id: string, cacheDir: string): string {
        const resolved = path.resolve(cacheDir);
        const destDir = path.join(resolved, id);
        const relative = path.relative(resolved, destDir);
        if (relative.startsWith('..') || path.isAbsolute(relative) || id.includes('..')) {
            throw new Error(`Invalid remote skill id '${id}'.`);
        }
        return destDir;
    }

    private writeMetadata(destDir: string, installed: InstalledRemoteSkill): void {
        fs.writeFileSync(path.join(destDir, METADATA_FILE), JSON.stringify(installed, null, 2), 'utf8');
    }

    private readMetadata(destDir: string): InstalledRemoteSkill | undefined {
        const metadataPath = path.join(destDir, METADATA_FILE);
        if (!fs.existsSync(metadataPath)) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as InstalledRemoteSkill;
            return parsed?.id && parsed?.url ? parsed : undefined;
        } catch {
            return undefined;
        }
    }
}
