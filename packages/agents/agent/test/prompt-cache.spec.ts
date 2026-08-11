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

@Suite('P69 prompt cache system prompt segmentation')
export class PromptCacheTest {
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
}
