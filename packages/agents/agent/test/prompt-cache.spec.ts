import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { PromptSection, PromptSectionContext } from '../src/prompt/PromptSection';
import { SystemPromptBuilder } from '../src/prompt/SystemPromptBuilder';
import { DateTimeSection } from '../src/prompt/sections/DateTimeSection';
import { MemorySection } from '../src/prompt/sections/MemorySection';
import { IdentitySection } from '../src/prompt/sections/IdentitySection';
import { ToolsSection } from '../src/prompt/sections/ToolsSection';

class StubSection extends PromptSection {
    constructor(private label: string, priorityValue: number, cacheableValue: boolean | undefined) {
        super();
        this.priority = priorityValue;
        if (cacheableValue !== undefined) {
            this.cacheable = cacheableValue;
        }
    }
    name(): string {
        return this.label;
    }
    render(_context: PromptSectionContext): string {
        return `section:${this.label}`;
    }
}

class GatedSection extends PromptSection {
    constructor(private label: string, private started: string[], private gate: Promise<void>) {
        super();
    }
    name(): string { return this.label; }
    async render(): Promise<string> {
        this.started.push(this.label);
        await this.gate;
        return `section:${this.label}`;
    }
}

@Suite('P69 prompt cache system prompt segmentation')
export class PromptCacheTest {
    @Test('renders independent prompt sections concurrently while preserving order')
    async rendersSectionsConcurrently() {
        const started: string[] = [];
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const builder = new SystemPromptBuilder([
            new GatedSection('first', started, gate),
            new GatedSection('second', started, gate)
        ]);

        const pending = builder.build({ sessionId: 's1' } as any);
        await Promise.resolve();
        await Promise.resolve();
        const startedBeforeRelease = started.slice();
        release();
        const prompt = await pending;

        expect(startedBeforeRelease).toEqual(['first', 'second']);
        expect(prompt).toEqual('section:first\n\nsection:second');
    }

    @Test('cacheable sections render before non-cacheable ones regardless of priority')
    async cacheableSectionsRenderFirst() {
        const builder = new SystemPromptBuilder([
            new StubSection('dynamic-low', 0, false),
            new StubSection('static-mid', 10, true),
            new StubSection('static-high', 50, true),
            new StubSection('dynamic-mid', 30, false)
        ]);

        const prompt = await builder.build({ sessionId: 's1' } as any);
        const staticMid = prompt.indexOf('section:static-mid');
        const staticHigh = prompt.indexOf('section:static-high');
        const dynamicLow = prompt.indexOf('section:dynamic-low');
        const dynamicMid = prompt.indexOf('section:dynamic-mid');

        expect(staticMid).toBeGreaterThan(-1);
        expect(staticHigh).toBeGreaterThan(staticMid);
        expect(dynamicLow).toBeGreaterThan(staticHigh);
        expect(dynamicMid).toBeGreaterThan(dynamicLow);
    }

    @Test('default sections order static prefix then dynamic tail')
    async defaultSectionsOrderStaticThenDynamic() {
        const builder = new SystemPromptBuilder([
            new ToolsSection(),
            new DateTimeSection(),
            new IdentitySection(),
            new MemorySection()
        ]);

        const prompt = await builder.build({
            sessionId: 's1',
            dateTime: '2026-08-11T00:00:00.000Z',
            memory: 'relevant memory',
            tools: [{ name: 'echo', description: 'echo input' }],
            model: 'test'
        } as any);

        const identity = prompt.indexOf('You are an autonomous task agent.');
        const tools = prompt.indexOf('## Available Tools');
        const memory = prompt.indexOf('## Relevant Memories');
        const dateTime = prompt.indexOf('Current date and time:');

        expect(identity).toBeGreaterThan(-1);
        expect(tools).toBeGreaterThan(identity);
        expect(dateTime).toBeGreaterThan(tools);
        expect(memory).toBeGreaterThan(dateTime);
    }

    @Test('buildParts separates the static prefix from the dynamic tail')
    async buildPartsSeparatesStaticAndDynamic() {
        const builder = new SystemPromptBuilder([
            new IdentitySection(),
            new DateTimeSection(),
            new MemorySection()
        ]);
        const parts = await builder.buildParts({
            sessionId: 's1',
            dateTime: '2026-08-11T00:00:00.000Z',
            memory: 'relevant memory',
            tools: [],
            model: 'test'
        } as any);

        expect(parts.cacheable).toContain('You are an autonomous task agent.');
        expect(parts.cacheable).not.toContain('Current date and time:');
        expect(parts.cacheable).not.toContain('## Relevant Memories');
        expect(parts.dynamic).toContain('Current date and time: 2026-08-11T00:00:00.000Z');
        expect(parts.dynamic).toContain('## Relevant Memories');
        // Legacy build() keeps the same combined text for callers/tests.
        expect(await builder.build({
            sessionId: 's1',
            dateTime: '2026-08-11T00:00:00.000Z',
            memory: 'relevant memory',
            tools: [],
            model: 'test'
        } as any)).toBe([parts.cacheable, parts.dynamic].filter(Boolean).join('\n\n'));
    }

    @Test('sections default to cacheable unless explicitly disabled')
    async sectionsDefaultToCacheable() {
        const plain = new StubSection('plain', 100, undefined);
        expect(plain.cacheable).toEqual(true);

        const dateTime = new DateTimeSection();
        expect(dateTime.cacheable).toEqual(false);

        const memory = new MemorySection();
        expect(memory.cacheable).toEqual(false);

        const identity = new IdentitySection();
        expect(identity.cacheable !== false).toEqual(true);

        const tools = new ToolsSection();
        expect(tools.cacheable !== false).toEqual(true);
    }

    @Test('omits the redundant tool listing when native tool schemas are supplied')
    async omitsRedundantToolListingWithNativeSchemas() {
        const tools = [
            { name: 'read_file', description: 'Read a file' },
            { name: 'todo', description: 'Maintain the plan' }
        ];
        const withNative = new ToolsSection().render({
            sessionId: 's1', memory: '', dateTime: '', tools, extra: { nativeToolSchemas: true }
        } as any);
        expect(withNative).not.toContain('## Available Tools');
        expect(withNative).not.toContain('- read_file: Read a file');
        expect(withNative).toContain('Use `todo`');

        const withoutNative = new ToolsSection().render({
            sessionId: 's1', memory: '', dateTime: '', tools, extra: {}
        } as any);
        expect(withoutNative).toContain('## Available Tools');
        expect(withoutNative).toContain('- read_file: Read a file');
    }

    @Test('project_intel guidance describes a formatter, not workspace analysis')
    async projectIntelGuidanceMatchesFormatter() {
        // project_intel only formats caller-provided task/todos/notes; the guidance
        // must not promise workspace analysis (a real run called it 3x and reported
        // it "misconfigured").
        const tools = [{ name: 'project_intel', description: 'Format caller-provided context' }];
        const identity = new IdentitySection().render({ sessionId: 's1', tools, memory: '', dateTime: '', extra: {} } as any);
        const toolSection = new ToolsSection().render({ sessionId: 's1', tools, memory: '', dateTime: '', extra: {} } as any);
        expect(identity).not.toContain('project/workspace analysis');
        expect(toolSection).not.toContain('workspace/project analysis');
        expect(toolSection).toContain('structured summary of the context');
    }

    @Test('reminds the agent to keep project structure docs current')
    async keepsProjectStructureDocsCurrent() {
        // AGENTS.md can require a current "Project Structure" section. A real
        // note-system build read the rules, applied the numbered rules, and
        // still left the structure stale, so the guidance is explicit.
        const identity = new IdentitySection().render({ sessionId: 's1', tools: [], memory: '', dateTime: '', extra: {} } as any);
        expect(identity).toContain('project-structure');
        expect(identity).toContain('update that file');
    }

    @Test('reminds the agent to preserve shared validators when behavior must not change')
    async preservesSharedValidators() {
        // A real ledger task said "without changing existing behavior"; the
        // model still tightened a shared requireDate validator. Keep the rule
        // explicit: new constraints belong at the new API boundary.
        const identity = new IdentitySection().render({ sessionId: 's1', tools: [], memory: '', dateTime: '', extra: {} } as any);
        expect(identity).toContain('preserve existing behavior');
        expect(identity).toContain('shared validators');
    }

    @Test('selects a model-specific identity override by provider and model')
    async selectsModelSpecificIdentity() {
        const section = new IdentitySection({
            modelPrompts: {
                anthropic: { rules: ['Prefer provider-specific behavior.'] }
            }
        } as any);
        const matched = section.render({
            sessionId: 's1', tools: [], memory: '', dateTime: '', extra: { provider: 'anthropic' }
        } as any);
        expect(matched).toContain('Prefer provider-specific behavior.');

        const unmatched = section.render({
            sessionId: 's1', tools: [], memory: '', dateTime: '', extra: { provider: 'openai' }
        } as any);
        expect(unmatched).not.toContain('Prefer provider-specific behavior.');
    }
}
