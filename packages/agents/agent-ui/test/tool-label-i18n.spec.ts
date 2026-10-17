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

    /**
     * Regression: `tool_failed` rows used to render only `"{label} failed"`,
     * dropping the producer's cause (`content_search failed: ENOTDIR …`), so the
     * actionable reason was invisible until the inspector was opened.
     */
    @Test('failed tool rows keep the actionable cause instead of a bare label')
    failedRowsKeepCause() {
        const failed = describeStreamEventContent('tool_failed', {
            toolName: 'content_search',
            content: "content_search failed: ENOTDIR: not a directory, stat '/w/test/cli.test.ts/**/*'"
        }, en);
        expect(failed).toContain('Search code failed');
        expect(failed).toContain('ENOTDIR');
        expect(failed).not.toContain('content_search failed');

        const zhFailed = describeStreamEventContent('tool_failed', {
            toolName: 'content_search',
            content: 'content_search failed: ENOTDIR'
        }, zh);
        expect(zhFailed).toContain('搜索代码未完成');
        expect(zhFailed).toContain('ENOTDIR');

        // No cause on the wire: keep the plain label, don't invent a colon.
        const bare = describeStreamEventContent('tool_failed', {
            toolName: 'git_operations',
            content: 'git_operations failed'
        }, en);
        expect(bare).toEqual('Check version control failed');
    }

    /**
     * Regression: `tool_skipped` used to pass the raw producer string through,
     * leaking the raw tool name and an unbounded multi-line reason.
     */
    @Test('skipped tool rows use the translated label and keep the bounded reason')
    skippedRowsKeepReason() {
        const skipped = describeStreamEventContent('tool_skipped', {
            toolName: 'terminal',
            content: 'terminal skipped: workspace is not trusted\nTrust it with: tsdi-agent trust <dir>'
        }, en);
        expect(skipped).toContain('Run command skipped');
        expect(skipped).toContain('workspace is not trusted');
        expect(skipped).not.toContain('terminal skipped');
        expect(skipped).not.toContain('\n');

        const bare = describeStreamEventContent('tool_skipped', {
            toolName: 'terminal',
            content: 'terminal skipped'
        }, en);
        expect(bare).toEqual('Run command skipped');
    }
}
