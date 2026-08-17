import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { McpServerInstructionsSection } from '../src/prompt/sections/McpServerInstructionsSection';

@Suite('P166 MCP server instructions prompt section')
export class McpServerInstructionsTest {
    @Test('returns empty string when no entries provided')
    emptyWhenNoEntries() {
        const section = new McpServerInstructionsSection();
        const result = section.render({ sessionId: 's1', tools: [], memory: '', dateTime: '' } as any);
        expect(result).toEqual('');
    }

    @Test('renders single server instructions')
    singleServer() {
        const section = new McpServerInstructionsSection([
            { serverId: 'demo', instructions: 'Always respond in JSON format.' }
        ]);
        const result = section.render({ sessionId: 's1', tools: [], memory: '', dateTime: '' } as any);
        expect(result).toContain('## MCP Server Instructions');
        expect(result).toContain('### demo');
        expect(result).toContain('Always respond in JSON format.');
    }

    @Test('renders multiple server instructions')
    multipleServers() {
        const section = new McpServerInstructionsSection([
            { serverId: 'server-a', instructions: 'Use tool A first.' },
            { serverId: 'server-b', instructions: 'Use tool B second.' }
        ]);
        const result = section.render({ sessionId: 's1', tools: [], memory: '', dateTime: '' } as any);
        expect(result).toContain('### server-a');
        expect(result).toContain('### server-b');
        expect(result).toContain('Use tool A first.');
        expect(result).toContain('Use tool B second.');
    }

    @Test('skips entries with empty instructions')
    skipsEmptyEntries() {
        const section = new McpServerInstructionsSection([
            { serverId: 'empty', instructions: '' },
            { serverId: 'valid', instructions: 'Has content.' }
        ]);
        const result = section.render({ sessionId: 's1', tools: [], memory: '', dateTime: '' } as any);
        expect(result).not.toContain('### empty');
        expect(result).toContain('### valid');
    }

    @Test('truncates total content to 1 KiB')
    truncatesTo1KiB() {
        const bigInstruction = 'x'.repeat(600);
        const section = new McpServerInstructionsSection([
            { serverId: 'a', instructions: bigInstruction },
            { serverId: 'b', instructions: bigInstruction },
            { serverId: 'c', instructions: bigInstruction }
        ]);
        const result = section.render({ sessionId: 's1', tools: [], memory: '', dateTime: '' } as any);
        expect(result.length).toBeLessThanOrEqual(1100);
    }

    @Test('falls back to context.extra.mcpServerInstructions when no injected entries')
    fallsBackToExtra() {
        const section = new McpServerInstructionsSection();
        const result = section.render({
            sessionId: 's1', tools: [], memory: '', dateTime: '',
            extra: { mcpServerInstructions: [{ serverId: 'from-extra', instructions: 'Extra content.' }] }
        } as any);
        expect(result).toContain('### from-extra');
        expect(result).toContain('Extra content.');
    }

    @Test('is not cacheable')
    notCacheable() {
        const section = new McpServerInstructionsSection();
        expect(section.cacheable).toEqual(false);
    }

    @Test('has correct priority')
    hasPriority() {
        const section = new McpServerInstructionsSection();
        expect(section.priority).toEqual(55);
    }
}
