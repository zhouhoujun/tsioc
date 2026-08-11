import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { FileAdapter, FileDirectoryEntry, IReadable, IStats } from '@tsdi/common';
import { findAgentsDoc, findFileUpward, findProjectRoot, readAgentsDoc, readAgentsDocChain, truncateDocContent } from '../src/project/agents-doc';
import { ProjectContextSection } from '../src/prompt/sections/ProjectContextSection';
import { PromptSectionContext } from '../src/prompt/PromptSection';
import { analyzeProjectStructure, buildAgentsMdDraft, initAgentsDoc } from '../src/project/init-agents-doc';

class TestFileAdapter extends FileAdapter {
    isAbsolute(target: string): boolean {
        return path.isAbsolute(target);
    }

    normalize(target: string): string {
        return path.normalize(target);
    }

    join(...targets: string[]): string {
        return path.join(...targets);
    }

    resolve(...targets: string[]): string {
        return path.resolve(...targets);
    }

    extname(target: string): string {
        return path.extname(target);
    }

    existsSync(target: string): boolean {
        return fs.existsSync(target);
    }

    read(target: string, options?: any): IReadable {
        return fs.createReadStream(target, options) as any;
    }

    async find(): Promise<null> {
        return null;
    }

    async readText(target: string, encoding: any = 'utf-8'): Promise<string> {
        return (await fs.promises.readFile(target, encoding)).toString();
    }

    readTextSync(target: string, encoding: any = 'utf-8'): string {
        return fs.readFileSync(target, encoding).toString();
    }

    async readJSON<T = any>(target: string): Promise<T> {
        return JSON.parse(this.readTextSync(target));
    }

    readJSONSync<T = any>(target: string): T {
        return JSON.parse(this.readTextSync(target));
    }

    async writeText(target: string, content: string, encoding: any = 'utf-8'): Promise<void> {
        await fs.promises.writeFile(target, content, encoding);
    }

    async mkdir(target: string, options?: { recursive?: boolean }): Promise<void> {
        await fs.promises.mkdir(target, { recursive: options?.recursive ?? false });
    }

    async remove(target: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
        await fs.promises.rm(target, {
            recursive: options?.recursive ?? false,
            force: options?.force ?? false
        });
    }

    async stat<T extends IStats = IStats>(target: string): Promise<T | null> {
        try {
            return await fs.promises.stat(target) as T;
        } catch {
            return null;
        }
    }

    async list(target: string): Promise<FileDirectoryEntry[]> {
        try {
            const entries = await fs.promises.readdir(target, { withFileTypes: true });
            return entries
                .slice()
                .sort((left, right) => {
                    if (left.isDirectory() !== right.isDirectory()) {
                        return left.isDirectory() ? -1 : 1;
                    }
                    return left.name.localeCompare(right.name);
                })
                .map(entry => ({
                    name: entry.name,
                    path: path.join(target, entry.name),
                    kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
                }));
        } catch {
            return [];
        }
    }
}

@Suite('agents-doc')
export class AgentsDocSpec {
    private tempRoot!: string;
    private fileAdapter!: TestFileAdapter;

    @Before()
    async init(): Promise<void> {
        this.tempRoot = mkdtempSync(join(tmpdir(), 'agents-doc-'));
        this.fileAdapter = new TestFileAdapter();
    }

    @After()
    async cleanup(): Promise<void> {
        rmSync(this.tempRoot, { recursive: true, force: true });
    }

    private makeContext(): PromptSectionContext {
        return { sessionId: 's1', tools: [], memory: '', dateTime: '2026-01-01T00:00:00.000Z' };
    }

    @Test('findFileUpward walks upward to locate a marker')
    async testFindFileUpward(): Promise<void> {
        const nested = join(this.tempRoot, 'a', 'b', 'c');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(this.tempRoot, 'a', 'marker.txt'), 'x');
        const exists = (target: string) => this.fileAdapter.existsSync(target);
        expect(findFileUpward(nested, 'marker.txt', { exists, stopAt: this.tempRoot })).toBe(join(this.tempRoot, 'a', 'marker.txt'));
        expect(findFileUpward(nested, 'missing.txt', { exists, stopAt: this.tempRoot })).toBeUndefined();
    }

    @Test('findAgentsDoc finds AGENTS.md at the project root from a nested dir')
    async testFindAgentsDoc(): Promise<void> {
        const nested = join(this.tempRoot, 'proj', 'src', 'deep');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(this.tempRoot, 'proj', 'AGENTS.md'), '# Project\n');
        const exists = (target: string) => this.fileAdapter.existsSync(target);
        expect(findAgentsDoc(nested, { exists, stopAt: this.tempRoot }).entries.map(entry => entry.file)).toEqual([join(this.tempRoot, 'proj', 'AGENTS.md')]);
        expect(findAgentsDoc(join(this.tempRoot, 'empty'), { exists, stopAt: this.tempRoot }).entries).toEqual([]);
    }

    @Test('findAgentsDoc builds an ordered root-to-cwd instruction chain')
    async testFindAgentsDocChain(): Promise<void> {
        const root = join(this.tempRoot, 'chain', 'proj');
        const nested = join(root, 'src', 'deep');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(root, 'AGENTS.md'), '# Root\n');
        writeFileSync(join(nested, 'AGENTS.md'), '# Nested\n');
        const chain = findAgentsDoc(nested, { exists: target => this.fileAdapter.existsSync(target), stopAt: this.tempRoot });
        expect(chain.entries.map(entry => entry.file)).toEqual([
            join(root, 'AGENTS.md'),
            join(nested, 'AGENTS.md')
        ]);
        expect(chain.entries[0].dir).toBe(root);
        expect(chain.entries[1].dir).toBe(nested);
    }

    @Test('findAgentsDoc prefers AGENTS.override.md over AGENTS.md per directory')
    async testFindAgentsDocOverride(): Promise<void> {
        const dir = join(this.tempRoot, 'override-proj');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'AGENTS.md'), '# Main\n');
        writeFileSync(join(dir, 'AGENTS.override.md'), '# Override\n');
        const chain = findAgentsDoc(dir, { exists: target => this.fileAdapter.existsSync(target), stopAt: this.tempRoot });
        expect(chain.entries.length).toBe(1);
        expect(chain.entries[0].file).toBe(join(dir, 'AGENTS.override.md'));
        expect(chain.entries[0].override).toBe(true);
    }

    @Test('findAgentsDoc falls back to extra filenames when the primary is missing')
    async testFindAgentsDocFallback(): Promise<void> {
        const dir = join(this.tempRoot, 'fallback-proj');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'CLAUDE.md'), '# Claude\n');
        const chain = findAgentsDoc(dir, { exists: target => this.fileAdapter.existsSync(target), fallbackFilenames: ['CLAUDE.md'], stopAt: this.tempRoot });
        expect(chain.entries.length).toBe(1);
        expect(chain.entries[0].file).toBe(join(dir, 'CLAUDE.md'));
        expect(chain.entries[0].override).toBe(false);
    }

    @Test('findProjectRoot locates the .git marker and returns its parent')
    async testFindProjectRoot(): Promise<void> {
        mkdirSync(join(this.tempRoot, 'repo'), { recursive: true });
        mkdirSync(join(this.tempRoot, 'repo', '.git'));
        const exists = (target: string) => this.fileAdapter.existsSync(target);
        expect(findProjectRoot(join(this.tempRoot, 'repo', 'src'), { exists, stopAt: this.tempRoot })).toBe(join(this.tempRoot, 'repo'));
        expect(findProjectRoot(this.tempRoot, { exists, stopAt: this.tempRoot })).toBeUndefined();
    }

    @Test('readAgentsDoc returns content or empty string')
    async testReadAgentsDoc(): Promise<void> {
        const dir = join(this.tempRoot, 'readdoc');
        mkdirSync(dir, { recursive: true });
        const file = join(dir, 'AGENTS.md');
        writeFileSync(file, '# Hi\n');
        const readText = (target: string) => this.fileAdapter.readTextSync(target);
        expect(readAgentsDoc(file, readText)).toBe('# Hi\n');
        expect(readAgentsDoc(join(dir, 'nope.md'), readText)).toBe('');
    }

    @Test('truncateDocContent caps bytes without splitting multi-byte characters')
    async testTruncateDocContent(): Promise<void> {
        const ascii = truncateDocContent('abcdef', 4);
        expect(ascii.content).toBe('abcd');
        expect(ascii.truncated).toBe(true);
        expect(ascii.bytes).toBe(4);
        const multi = truncateDocContent('中文测试abc', 10);
        expect(multi.content).toBe('中文测');
        expect(multi.bytes).toBe(9);
        expect(multi.truncated).toBe(true);
        expect(truncateDocContent('hi', 100).truncated).toBe(false);
        expect(truncateDocContent('abc', 0).content).toBe('');
    }

    @Test('readAgentsDocChain reads and byte-caps every chain entry')
    async testReadAgentsDocChain(): Promise<void> {
        const dir = join(this.tempRoot, 'readchain');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'AGENTS.md'), '# Root doc\n');
        const read = readAgentsDocChain(
            findAgentsDoc(dir, { exists: target => this.fileAdapter.existsSync(target), stopAt: this.tempRoot }),
            { maxBytes: 6, readText: target => this.fileAdapter.readTextSync(target) }
        );
        expect(read.entries[0].content).toBe('# Root');
        expect(read.entries[0].truncated).toBe(true);
        expect(read.entries[0].bytes).toBe(6);
    }

    @Test('ProjectContextSection renders AGENTS.md content and skips when absent')
    async testProjectContextSection(): Promise<void> {
        const project = join(this.tempRoot, 'section-proj');
        mkdirSync(project, { recursive: true });
        writeFileSync(join(project, 'AGENTS.md'), '# Demo\n\nBuild with npm run build.\n');

        const section = new ProjectContextSection(this.fileAdapter);
        section.setProjectRoot(project);
        const rendered = await section.render(this.makeContext());
        expect(rendered).toContain('## Project Context');
        expect(rendered).toContain('# Demo');
        expect(rendered).toContain('npm run build');

        const absentRoot = mkdtempSync(join(tmpdir(), 'agents-doc-empty-'));
        try {
            const emptySection = new ProjectContextSection(this.fileAdapter);
            emptySection.setProjectRoot(absentRoot);
            expect(await emptySection.render(this.makeContext())).toBe('');
        } finally {
            rmSync(absentRoot, { recursive: true, force: true });
        }
        expect(new ProjectContextSection().name()).toBe('project-context');
    }

    @Test('ProjectContextSection renders the ordered chain root-to-cwd')
    async testProjectContextSectionChain(): Promise<void> {
        const root = join(this.tempRoot, 'section-chain', 'proj');
        const nested = join(root, 'src');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(root, 'AGENTS.md'), '# Root rules\n\nRoot content.\n');
        writeFileSync(join(nested, 'AGENTS.md'), '# Nested rules\n\nNested content.\n');

        const section = new ProjectContextSection(this.fileAdapter, { cwd: nested } as any);
        section.setProjectRoot(root);
        const rendered = await section.render(this.makeContext());
        const rootIndex = rendered.indexOf('# Root rules');
        expect(rootIndex).toBeGreaterThanOrEqual(0);
        expect(rendered.indexOf('# Nested rules')).toBeGreaterThan(rootIndex);
    }

    @Test('ProjectContextSection honors override files and the byte cap')
    async testProjectContextSectionOverrideAndCap(): Promise<void> {
        const dir = join(this.tempRoot, 'section-override');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'AGENTS.md'), '# Main\n');
        writeFileSync(join(dir, 'AGENTS.override.md'), '# Override body\n');

        const section = new ProjectContextSection(this.fileAdapter, null, { projectDocMaxBytes: 10 });
        section.setProjectRoot(dir);
        const rendered = await section.render(this.makeContext());
        expect(rendered).toContain('· override');
        expect(rendered).toContain('# Override');
        expect(rendered).not.toContain('# Main');
        expect(rendered).not.toContain('body');
    }

    @Test('analyzeProjectStructure reads package.json metadata and source languages')
    async testAnalyzeProjectStructure(): Promise<void> {
        const project = join(this.tempRoot, 'proj');
        mkdirSync(join(project, 'src'), { recursive: true });
        writeFileSync(join(project, 'package.json'), JSON.stringify({
            name: 'demo-app',
            description: 'A demo app',
            scripts: { build: 'tsc', test: 'ts-node unit.ts' }
        }));
        writeFileSync(join(project, 'src', 'index.ts'), 'export const x = 1;');

        const summary = await analyzeProjectStructure(project, this.fileAdapter);
        expect(summary.name).toBe('demo-app');
        expect(summary.description).toBe('A demo app');
        expect(summary.languages).toContain('TypeScript');
        expect(summary.buildCommands).toContain('- `npm run build`');
        expect(summary.buildCommands).toContain('- `npm run test`');
        expect(summary.vcs).toBe('none');
    }

    @Test('buildAgentsMdDraft produces a markdown draft with key sections')
    async testBuildAgentsMdDraft(): Promise<void> {
        const summary = await analyzeProjectStructure(this.tempRoot, this.fileAdapter);
        const draft = buildAgentsMdDraft({ ...summary, name: 'demo' });
        expect(draft).toContain('# demo');
        expect(draft).toContain('## Key Commands');
        expect(draft).toContain('## Tech Stack');
        expect(draft).toContain('## Project Structure');
    }

    @Test('initAgentsDoc creates AGENTS.md and refuses to overwrite without force')
    async testInitAgentsDoc(): Promise<void> {
        const project = join(this.tempRoot, 'init-proj');
        mkdirSync(project, { recursive: true });
        writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'demo' }));

        const created = await initAgentsDoc({ root: project, fileAdapter: this.fileAdapter });
        expect(created.created).toBe(true);
        expect(created.file).toBe(join(project, 'AGENTS.md'));
        expect(existsSync(created.file)).toBe(true);
        expect(created.draft).toContain('# demo');

        const existing = await initAgentsDoc({ root: project, fileAdapter: this.fileAdapter });
        expect(existing.created).toBe(false);
        expect(existing.reason).toContain('already exists');

        const forced = await initAgentsDoc({ root: project, force: true, fileAdapter: this.fileAdapter });
        expect(forced.created).toBe(true);
    }
}
