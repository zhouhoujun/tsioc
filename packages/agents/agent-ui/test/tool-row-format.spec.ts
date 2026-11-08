import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleMessageRendererRegistry,
    AgentUiModule,
    renderAgentConsoleMessageItem
} from '../src';
import { formatToolCallLabel, describeStreamEventContent, formatToolEventRow } from '../src/AgentConsoleStreamHelpers';
import { agentUiEnglish } from '../src/agent-ui.i18n';
import type { AgentMessage } from '@tsdi/agent';

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

/**
 * Live/replay tool rows must have ONE stable identity.
 *
 * Real run finding: the live row read `✓ Tool · Read file completed · README.md`
 * while the same call replayed as `Read README.md`, and a pending row read
 * `Read file: README.md` before flipping to the `completed` shape. The row is
 * now `<glyph> <label> · <object>` in every phase: the glyph carries state, the
 * family label is omitted, and pending/completed compose the same text.
 */
@Suite('tool timeline rows keep one stable shape')
export class ToolRowFormatTest {
    private ctx!: ApplicationContext;
    private registry!: AgentConsoleMessageRendererRegistry;

    @Before()
    async setup() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        this.registry = this.ctx.get(AgentConsoleMessageRendererRegistry);
    }

    @After()
    async teardown() { await this.ctx.close(); }

    private toolEvent(eventType: string, content: string, extra: Record<string, any> = {}): AgentMessage {
        return {
            id: `${eventType}-1`,
            role: 'assistant',
            content,
            createdAt: 1,
            metadata: {
                uiKind: 'event',
                uiEventType: eventType,
                uiEventLabel: 'read_file',
                status: eventType === 'tool_completed' ? 'success' : 'running',
                durationMs: eventType === 'tool_completed' ? 11 : undefined,
                ...extra
            }
        } as AgentMessage;
    }

    @Test('pending tool-call rows separate verb and object with a middot')
    pendingRowShape() {
        const row = formatToolCallLabel({ name: 'read_file', input: { path: 'README.md' } }, en);
        expect(row).toEqual('Read file · README.md');
        expect(row).not.toContain(':');
    }

    @Test('invoked and completed rows use the same text')
    liveLifecycleShape() {
        const invoked = describeStreamEventContent('tool_invoked', {
            toolName: 'read_file',
            content: 'read_file · README.md'
        }, en);
        const completed = describeStreamEventContent('tool_completed', {
            toolName: 'read_file',
            content: 'read_file · README.md'
        }, en);
        expect(invoked).toEqual('Read file · README.md');
        expect(completed).toEqual(invoked);
        expect(completed).not.toContain('completed');
        expect(completed).not.toContain('Running');
    }

    @Test('a replayed row is composed with the live formula')
    replayMatchesLive() {
        expect(formatToolEventRow('read_file', 'README.md', 'README.md (truncated)', undefined, en))
            .toEqual('Read file · README.md (truncated)');
        expect(formatToolEventRow('terminal', 'npm test', 'exit 0 · 40 lines', undefined, en))
            .toEqual('Run command · npm test · exit 0 · 40 lines');
        expect(formatToolEventRow('terminal', 'sleep 90', undefined, 'Command cancelled by the user.', en))
            .toEqual('Run command failed: Command cancelled by the user.');
    }

    @Test('todo merge rows keep only the resulting plan summary')
    todoMergeSummary() {
        expect(formatToolEventRow('todo', '1 item · 1 completed', '3 items · 3 completed', undefined, en))
            .toEqual('Update plan · 3 items · 3 completed');
    }

    @Test('merged todo stream rows keep only the resulting plan counts')
    todoStreamRowSummary() {
        expect(describeStreamEventContent('tool_completed', {
            toolName: 'todo',
            content: 'todo · 1 item · 1 completed · 3 items · 3 completed'
        }, en)).toEqual('Update plan · 3 items · 3 completed');
    }

    @Test('a rendered tool event omits the redundant `Tool · ` family label')
    renderedToolRowHasNoFamilyLabel() {
        const rendered = renderAgentConsoleMessageItem(
            this.toolEvent('tool_completed', 'Read file · README.md'),
            { rendererRegistry: this.registry }
        );
        const first = rendered.lines[0];
        expect(first.role).toEqual('');
        expect(first.content).toEqual('Read file · README.md');
        expect(`${first.status || ''}${first.role || ''}${first.content || ''}`).not.toContain('Tool · ');
    }

    @Test('thought rows still render their family label')
    thoughtRowKeepsLabel() {
        const rendered = renderAgentConsoleMessageItem({
            id: 'thought-1',
            role: 'assistant',
            content: '检查计时器实现',
            createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'reasoning', status: 'success', durationMs: 12 }
        } as AgentMessage, { rendererRegistry: this.registry });
        expect(rendered.lines[0].role).toEqual('Thought · ');
    }
}
