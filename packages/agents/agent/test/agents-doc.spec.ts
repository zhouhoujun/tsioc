import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findAgentsDoc, findFileUpward, findProjectRoot, readAgentsDoc } from '../src/project/agents-doc';
import { ProjectContextSection } from '../src/prompt/sections/ProjectContextSection';
import { PromptSectionContext } from '../src/prompt/PromptSection';
import { analyzeProjectStructure, buildAgentsMdDraft, initAgentsDoc } from '../src/project/init-agents-doc';

@Suite('agents-doc')
export class AgentsDocSpec {
    private tempRoot!: string;

    @Before()
    async init(): Promise<void> {
        this.tempRoot = mkdtempSync(join(tmpdir(), 'agents-doc-'));
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
        expect(findFileUpward(nested, 'marker.txt')).toBe(join(this.tempRoot, 'a', 'marker.txt'));
        expect(findFileUpward(nested, 'missing.txt')).toBeUndefined();
    }

    @Test('findAgentsDoc finds AGENTS.md at the project root from a nested dir')
    async testFindAgentsDoc(): Promise<void> {
        const nested = join(this.tempRoot, 'proj', 'src', 'deep');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(this.tempRoot, 'proj', 'AGENTS.md'), '# Project\n');
        expect(findAgentsDoc(nested)).toBe(join(this.tempRoot, 'proj', 'AGENTS.md'));
        expect(findAgentsDoc(join(this.tempRoot, 'empty'))).toBeUndefined();
    }

    @Test('findProjectRoot locates the .git marker and returns its parent')
    async testFindProjectRoot(): Promise<void> {
        mkdirSync(join(this.tempRoot, 'repo'), { recursive: true });
        mkdirSync(join(this.tempRoot, 'repo', '.git'));
        expect(findProjectRoot(join(this.tempRoot, 'repo', 'src'))).toBe(join(this.tempRoot, 'repo'));
        expect(findProjectRoot(this.tempRoot)).toBeUndefined();
    }

    @Test('readAgentsDoc returns content or empty string')
    async testReadAgentsDoc(): Promise<void> {
        const file = join(this.tempRoot, 'AGENTS.md');
        writeFileSync(file, '# Hi\n');
        expect(readAgentsDoc(file)).toBe('# Hi\n');
        expect(readAgentsDoc(join(this.tempRoot, 'nope.md'))).toBe('');
    }

    @Test('ProjectContextSection renders AGENTS.md content and skips when absent')
    async testProjectContextSection(): Promise<void> {
        const project = join(this.tempRoot, 'section-proj');
        mkdirSync(project, { recursive: true });
        writeFileSync(join(project, 'AGENTS.md'), '# Demo\n\nBuild with npm run build.\n');

        const section = new ProjectContextSection();
        section.setProjectRoot(project);
        const rendered = await section.render(this.makeContext());
        expect(rendered).toContain('## Project Context');
        expect(rendered).toContain('# Demo');
        expect(rendered).toContain('npm run build');

        const absentRoot = mkdtempSync(join(tmpdir(), 'agents-doc-empty-'));
        try {
            const emptySection = new ProjectContextSection();
            emptySection.setProjectRoot(absentRoot);
            expect(await emptySection.render(this.makeContext())).toBe('');
        } finally {
            rmSync(absentRoot, { recursive: true, force: true });
        }
        expect(new ProjectContextSection().name()).toBe('project-context');
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

        const summary = analyzeProjectStructure(project);
        expect(summary.name).toBe('demo-app');
        expect(summary.description).toBe('A demo app');
        expect(summary.languages).toContain('TypeScript');
        expect(summary.buildCommands).toContain('- `npm run build`');
        expect(summary.buildCommands).toContain('- `npm run test`');
        expect(summary.vcs).toBe('none');
    }

    @Test('buildAgentsMdDraft produces a markdown draft with key sections')
    async testBuildAgentsMdDraft(): Promise<void> {
        const summary = analyzeProjectStructure(this.tempRoot);
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

        const created = await initAgentsDoc({ root: project });
        expect(created.created).toBe(true);
        expect(created.file).toBe(join(project, 'AGENTS.md'));
        expect(existsSync(created.file)).toBe(true);
        expect(created.draft).toContain('# demo');

        const existing = await initAgentsDoc({ root: project });
        expect(existing.created).toBe(false);
        expect(existing.reason).toContain('already exists');

        const forced = await initAgentsDoc({ root: project, force: true });
        expect(forced.created).toBe(true);
    }
}
