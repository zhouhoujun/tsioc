import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { runDisplayCommand } from '../src/AgentConsoleDisplayCommands';

async function settle(times = 64): Promise<void> {
    for (let index = 0; index < times; index++) {
        await Promise.resolve();
    }
}

const plain = (line: string): string => String(line || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');

function toolEvent(id: string, label: string, options: { status?: string; durationMs?: number } = {}): any {
    return {
        id,
        role: 'assistant',
        content: `${label} output`,
        createdAt: 1,
        metadata: {
            uiKind: 'event',
            uiEventType: `tool_${options.status === 'running' ? 'started' : 'end'}`,
            status: options.status || 'completed',
            durationMs: options.durationMs ?? 100,
            uiEventLabel: label,
            timeline: { toolCallId: id }
        }
    };
}

function userMessage(id: string, content = 'do it'): any {
    return { id, role: 'user', content, createdAt: 0 };
}

function assistantMessage(id: string, content = 'done'): any {
    return { id, role: 'assistant', content, createdAt: 100 };
}

@Suite('agent console activity aggregation')
export class AgentConsoleActivityAggregationTest {
    /** Fresh state per test: suites share the instance and the projection cache. */
    protected state(verbosity: 'low' | 'medium' | 'high' = 'medium'): AgentConsoleSessionState {
        const state = new AgentConsoleSessionState();
        state.consoleOptions = { ...state.consoleOptions, activityVerbosity: verbosity };
        return state;
    }

    @Test('high verbosity keeps every step row')
    highVerbosityKeepsSteps() {
        const messages = [userMessage('u'), toolEvent('t1', 'read'), toolEvent('t2', 'grep'), assistantMessage('a')];
        const state = this.state('high');
        state.messages = messages;
        expect(state.displayMessages.map(message => message.id)).toEqual(['u', 't1', 't2', 'a']);
    }

    @Test('medium verbosity collapses a finished step run into one activity row')
    mediumVerbosityAggregates() {
        const state = this.state();
        state.messages = [userMessage('u'), toolEvent('t1', 'read'), toolEvent('t2', 'grep'), assistantMessage('a')];
        const display = state.displayMessages;
        expect(display.map(message => message.id)).toEqual(['u', '__activity__t1', 'a']);
        expect(display[1].content).toContain('2 steps');
        expect(display[1].metadata?.uiKind).toEqual('activity');
        expect(display[1].metadata?.activityCount).toEqual(2);
        expect(display[1].metadata?.durationMs).toEqual(200);
    }

    @Test('expanding the activity lists each step on its own line')
    expandedActivityListsSteps() {
        const state = this.state();
        state.messages = [userMessage('u'), toolEvent('t1', 'read'), toolEvent('t2', 'grep'), assistantMessage('a')];
        expect(state.displayMessages[1].content).not.toContain('✓');
        state.setMessageExpanded('__activity__t1', true);
        const expanded = state.displayMessages[1];
        const lines = String(expanded.content).split('\n');
        expect(lines.length).toEqual(3);
        expect(lines[0]).toContain('2 steps');
        expect(lines[1]).toContain('read');
        expect(lines[2]).toContain('grep');
    }

    @Test('running and failed steps stay visible outside the activity row')
    keepsRunningAndFailedSteps() {
        const state = this.state();
        state.messages = [
            userMessage('u'),
            toolEvent('t1', 'read'),
            toolEvent('t2', 'grep'),
            toolEvent('run', 'write', { status: 'running' }),
            { ...toolEvent('bad', 'shell'), metadata: { uiKind: 'event', uiEventType: 'tool_end', status: 'failed', error: 'boom', uiEventLabel: 'shell' } },
            assistantMessage('a')
        ];
        const ids = state.displayMessages.map(message => message.id);
        expect(ids).toContain('__activity__t1');
        expect(ids).toContain('run');
        expect(ids).toContain('bad');
    }

    @Test('a single finished step is not collapsed')
    singleStepStays() {
        const state = this.state();
        state.messages = [userMessage('u'), toolEvent('t1', 'read'), assistantMessage('a')];
        expect(state.displayMessages.map(message => message.id)).toEqual(['u', 't1', 'a']);
    }

    @Test('low verbosity also folds settled reasoning into the activity run')
    lowVerbosityFoldsThoughts() {
        const thought = {
            id: 'th',
            role: 'assistant',
            content: 'thinking about it',
            createdAt: 1,
            metadata: { reasoning: true, uiEventType: 'reasoning', status: 'completed' }
        };
        const messages = [userMessage('u'), toolEvent('t1', 'read'), thought, assistantMessage('a')];
        const medium = this.state('medium');
        medium.messages = messages;
        expect(medium.displayMessages.map(message => message.id)).toEqual(['u', 't1', 'th', 'a']);
        const low = this.state('low');
        low.messages = messages;
        expect(low.displayMessages.map(message => message.id)).toEqual(['u', '__activity__t1', 'a']);
    }

    @Test('/display activity switches and persists the verbosity level')
    async displayCommandSetsVerbosity() {
        const state = this.state();
        const notices: string[] = [];
        const persisted: any[] = [];
        await runDisplayCommand('activity low', state, message => notices.push(message), async patch => {
            persisted.push(patch);
        });
        expect(state.consoleOptions.activityVerbosity).toEqual('low');
        expect(persisted[0]).toEqual({ activityVerbosity: 'low' });
        expect(notices.length).toEqual(1);
        await runDisplayCommand('activity low', state, message => notices.push(message), async patch => {
            persisted.push(patch);
        });
        // No bare argument steps down to the next quieter level (low -> high).
        await runDisplayCommand('activity', state, message => notices.push(message), async patch => {
            persisted.push(patch);
        });
        expect(state.consoleOptions.activityVerbosity).toEqual('high');
    }
}

@Suite('agent console activity rendering')
export class AgentConsoleActivityRenderingTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    @Test('the transcript shows one expandable activity row and reveals steps when expanded')
    async rendersActivityRow() {
        const ref: ComponentRef<AgentConsoleComponent> = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx });
        await ref.render();
        const instance: any = ref.instance;
        const state: any = instance.sessionState;
        (instance as any).sessionService = new Proxy({}, {
            get: () => async () => []
        });
        state.configure({ sessionId: 'session-a' });
        state.setSessions([{ id: 'session-a', current: true, title: 'Alpha', workspace: '/work' }]);
        state.setOpenSessionIds(['session-a']);
        state.consoleOptions = { ...state.consoleOptions, activityVerbosity: 'medium' };
        state.setMessages([
            userMessage('u'),
            toolEvent('t1', 'read'),
            toolEvent('t2', 'grep'),
            toolEvent('t3', 'edit'),
            assistantMessage('a')
        ]);
        const surface = new TuiTerminalSurface({
            renderer: this.ctx.get(TuiRenderer),
            root: ref.elementRef.nativeElement,
            width: 90,
            height: 24,
            nativeScrollback: false,
            scrollViewport: true,
            scrollRegionId: 'transcript',
            footerRegionId: 'footer',
            output: { write() {} }
        });
        try {
            await settle();
            surface.render();
            const lines = surface.lastRenderedLines.map(plain);
            const activityLine = lines.find(line => line.includes('Activity') && line.includes('3 steps'));
            expect(!!activityLine).toEqual(true);
            expect(lines.some(line => /\bread\b/.test(line) && line.includes('output'))).toEqual(false);

            state.setMessageExpanded('__activity__t1', true);
            await settle();
            surface.render();
            const expanded = surface.lastRenderedLines.map(plain);
            expect(expanded.some(line => line.includes('read'))).toEqual(true);
            expect(expanded.some(line => line.includes('grep'))).toEqual(true);
            expect(expanded.some(line => line.includes('edit'))).toEqual(true);
        } finally {
            surface.destroy();
        }
    }
}
