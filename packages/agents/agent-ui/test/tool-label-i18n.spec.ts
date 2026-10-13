import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveAgentToolLabel, formatToolCallLabel, describeStreamEventContent } from '../src/AgentConsoleStreamHelpers';
import { agentUiEnglish, agentUiChinese } from '../src/agent-ui.i18n';

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const en = { translate: translateFrom(agentUiEnglish) };
const zh = { translate: translateFrom(agentUiChinese) };

/**
 * Regression: an unmapped tool name used to leak the raw i18n key
 * (`agent.tool.parallel_spawn`) because the translator returns the key itself
 * for a missing entry, which is truthy and short-circuited the humanized
 * fallback. Labels must never render a raw `agent.tool.*` key.
 */
@Suite('agent-ui tool label i18n (no raw key leak)')
export class AgentUiToolLabelI18nTest {
    @Test('maps known tools and humanizes unknown ones instead of leaking the key')
    labels() {
        expect(resolveAgentToolLabel(en, 'read_file')).toEqual('Read file');
        expect(resolveAgentToolLabel(en, 'parallel_spawn')).toEqual('Run parallel tasks');
        expect(resolveAgentToolLabel(zh, 'parallel_spawn')).toEqual('并行执行任务');

        // Unknown/dynamic tool (e.g. an MCP tool): humanized, never the raw key.
        const unknown = resolveAgentToolLabel(en, 'mcp.demo.echo');
        expect(unknown).not.toContain('agent.tool.');
        expect(unknown).toEqual('mcp demo echo');

        // No translator at all: still humanized, never empty.
        expect(resolveAgentToolLabel(undefined, 'parallel_spawn')).toEqual('parallel spawn');
        expect(resolveAgentToolLabel(en, '')).toEqual('');
    }

    @Test('tool rows never render a raw agent.tool key')
    toolRows() {
        const completed = describeStreamEventContent(
            'tool_completed',
            { toolName: 'parallel_spawn', content: 'completed · parallel 2 tasks · 2 succeeded' },
            en
        );
        expect(completed).not.toContain('agent.tool.');
        expect(completed).toContain('Run parallel tasks');

        const call = formatToolCallLabel({ name: 'parallel_spawn' }, { translate: (key: string) => key });
        expect(call).not.toContain('agent.tool.');
        expect(call).toContain('parallel spawn');

        const unknownCall = formatToolCallLabel({ name: 'some_dynamic_tool' }, { translate: (key: string) => key });
        expect(unknownCall).not.toContain('agent.tool.');
        expect(unknownCall).toEqual('some dynamic tool');
    }
}
