import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { runActivityJumpCommand } from '../src/AgentConsoleActivityJumpCommands';

const message = (id: string, role: string, content: string, createdAt: number, metadata?: any): any =>
    ({ id, role, content, createdAt, ...(metadata ? { metadata } : {}) });

function createHost(messages: any[]) {
    const state = new AgentConsoleSessionState();
    state.setMessages(messages);
    const notices: string[] = [];
    return {
        state,
        notices,
        translator: undefined,
        notify: (value: string) => notices.push(value),
        select: async (_title: string, options: Array<{ value: string }>) => options[0]?.value
    } as any;
}

const transcript = () => [
    message('u1', 'user', 'hello', 1),
    message('t1', 'assistant', 'thinking', 2, { uiEventType: 'reasoning', reasoning: true, status: 'completed' }),
    message('tool1', 'assistant', 'read file', 3, { uiKind: 'event', uiEventType: 'tool_end', status: 'completed', timeline: { toolCallId: 't' } }),
    message('plan1', 'assistant', '# Todos\n- one', 4, { uiKind: 'plan-todo', planItems: [] }),
    message('diff1', 'assistant', 'files changed', 5, { uiKind: 'file-change' }),
    message('err1', 'assistant', 'boom', 6, { error: true, status: 'failed' }),
    message('a1', 'assistant', 'final answer', 7)
];

@Suite('agent console activity jump')
export class AgentConsoleActivityJumpTest {
    @Test('jumps to the latest row of each activity category')
    async jumpsToEachCategory() {
        const cases: Array<[string, string]> = [
            ['tools', 'tool1'],
            ['reasoning', 't1'],
            ['plan', 'plan1'],
            ['diff', 'diff1'],
            ['errors', 'err1'],
            ['answer', 'a1']
        ];
        for (const [category, expected] of cases) {
            const host = createHost(transcript());
            await runActivityJumpCommand(host, category);
            expect(host.state.selectedMessageId).toEqual(expected);
            expect(host.state.messagesFocused).toEqual(true);
            expect(host.notices.at(-1)).toContain('Jumped to latest');
        }
    }

    @Test('answer also jumps to a streaming partial answer')
    async jumpsToStreamingAnswer() {
        const host = createHost([
            message('u1', 'user', 'hello', 1),
            message('p1', 'assistant', 'partial answer', 2, { streaming: true })
        ]);
        const revealed: string[] = [];
        host.state.revealMessageAction = (id: string) => { revealed.push(id); return true; };
        await runActivityJumpCommand(host, 'answer');
        expect(host.state.selectedMessageId).toEqual('p1');
        expect(revealed).toEqual(['p1']);
        expect(host.notices.at(-1)).toContain('Jumped to latest');
    }

    @Test('category tabs show per-category counts')
    async categoryTabsShowCounts() {
        const host = createHost(transcript());
        let options: Array<{ label: string; value: string }> = [];
        host.select = async (_title: string, next: Array<{ label: string; value: string }>) => {
            options = next;
            return undefined;
        };
        await runActivityJumpCommand(host);
        const labels = options.map(option => option.label);
        expect(labels).toContain('Tools (1)');
        expect(labels).toContain('Reasoning (1)');
        expect(labels).toContain('Plan (1)');
        expect(labels).toContain('Diff (1)');
        expect(labels).toContain('Errors (1)');
        expect(labels).toContain('Final answer (1)');
    }

    @Test('no argument opens the category tabs and jumps to the selection')
    async selectsCategoryWhenCalledBare() {
        const host = createHost(transcript());
        await runActivityJumpCommand(host);
        expect(host.state.selectedMessageId).toEqual('tool1');
    }

    @Test('reports when the transcript has no row of that category')
    async reportsMissingCategory() {
        const host = createHost([
            message('u1', 'user', 'hello', 1),
            message('a1', 'assistant', 'done', 2)
        ]);
        await runActivityJumpCommand(host, 'errors');
        expect(host.notices.at(-1)).toContain('No Errors activity');
    }

    @Test('reveals the selected row when the host provides a reveal action')
    async revealsSelectedRow() {
        const host = createHost(transcript());
        const revealed: string[] = [];
        host.state.revealMessageAction = (id: string) => { revealed.push(id); return true; };
        await runActivityJumpCommand(host, 'tools');
        expect(revealed).toEqual(['tool1']);
    }
}
