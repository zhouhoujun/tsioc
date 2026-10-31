import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { AgentConsoleSessionsPanelComponent } from '../src/AgentConsolePanels';
import { formatSessionAge, formatSessionHint } from '../src/AgentConsoleFormatters';
import { COMMAND_HANDLERS } from '../src/AgentConsoleCommandHandlers';
import { navigationFor } from './test-transcript-navigation';

const HOUR = 3600_000;

function sessionsState() {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.setSessions([
        { id: 'chat-old', current: false, title: 'Old task', updatedAt: Date.now() - 3 * HOUR, messageCount: 4 } as any,
        { id: 'chat-new', current: true, title: 'New task', updatedAt: Date.now() - 60_000, messageCount: 2 } as any
    ]);
    state.setSessionsFocused(true);
    return state;
}

@Suite('/sessions picker: title + time, newest first, searchable')
export class SessionPickerTest {
    @Test('formats compact session ages')
    sessionAge() {
        const now = Date.UTC(2026, 9, 27, 12, 0, 0);
        expect(formatSessionAge(undefined, now)).toEqual('');
        expect(formatSessionAge(now - 10_000, now)).toEqual(' · <1m');
        expect(formatSessionAge(now - 5 * 60_000, now)).toEqual(' · 5m');
        expect(formatSessionAge(now - 3 * HOUR, now)).toEqual(' · 3h');
        expect(formatSessionAge(now - 50 * HOUR, now)).toEqual(' · 2d');
        expect(formatSessionAge(now - 30 * 24 * HOUR, now)).toEqual(' · 2026-09-27');
    }

    @Test('appends the active filter to the hint')
    sessionHint() {
        expect(formatSessionHint('esc', undefined)).toEqual('esc');
        expect(formatSessionHint('esc', '  probe ')).toEqual('esc · filter: probe');
    }

    @Test('rows show the title followed by the age')
    rowShowsAge() {
        const state = sessionsState();
        const panel = new AgentConsoleSessionsPanelComponent(state);
        const label = panel.sessionAt(0)?.label || '';
        expect(label).toContain('Old task');
        expect(label).toContain(' · 3h');
        expect(label).toContain('(4)');
    }

    @Test('typing filters by title/id, backspace edits, Esc clears then closes')
    async typeToSearch() {
        const state = sessionsState();
        const nav = navigationFor(state);

        await state.handleFocusKey('n', nav);
        expect(state.sessionsFocused).toEqual(true);
        expect(state.navFilter.text).toEqual('n');
        expect(state.navFilteredSessions.map(item => item.id)).toEqual(['chat-new']);

        await state.handleFocusKey('backspace', nav);
        expect(state.navFilter.text).toBeUndefined();

        for (const char of 'new') {
            await state.handleFocusKey(char, nav);
        }
        expect(state.navFilter.text).toEqual('new');
        expect(state.navFilteredSessions.map(item => item.id)).toEqual(['chat-new']);
        expect(state.selectedSessionId).toEqual('chat-new');

        await state.handleFocusKey('esc', nav);
        expect(state.sessionsFocused).toEqual(true);
        expect(state.navFilter.text).toBeUndefined();
        expect(state.navFilteredSessions.length).toEqual(2);

        await state.handleFocusKey('esc', nav);
        expect(state.sessionsFocused).toEqual(false);
    }

    @Test('a pasted or fast-typed chunk extends the search instead of being dropped')
    async chunkExtendsSearch() {
        const state = sessionsState();
        const nav = navigationFor(state);
        const outcome = await state.processDecodedInput(
            { text: 'chat' } as any,
            'chat',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: nav
            }
        );
        expect(outcome.handled).toEqual(true);
        expect(state.navFilter.text).toEqual('chat');
        expect(state.sessionsFocused).toEqual(true);
    }

    @Test('a coalesced DEL chunk removes one char per byte')
    async delChunkEditsSearch() {
        const state = sessionsState();
        state.navFilter = { text: 'chat' };
        const outcome = await state.processDecodedInput(
            { text: '\u007f\u007f' } as any,
            '\u007f\u007f',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state)
            }
        );
        expect(outcome.handled).toEqual(true);
        expect(state.navFilter.text).toEqual('ch');
        expect(state.sessionsFocused).toEqual(true);
    }

    @Test('a raw DEL byte edits the search instead of becoming filter text')
    async delByteEditsSearch() {
        const state = sessionsState();
        state.navFilter = { text: 'chat' };
        const outcome = await state.processDecodedInput(
            { text: '\u007f' } as any,
            '\u007f',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state)
            }
        );
        expect(outcome.handled).toEqual(true);
        expect(state.navFilter.text).toEqual('cha');
        expect(state.sessionsFocused).toEqual(true);
    }

    @Test('/sessions <query> opens the picker with that search')
    async commandPrefilters() {
        const filters: any[] = [];
        const focused: boolean[] = [];
        const ctx: any = {
            refreshSessions: async () => undefined,
            notify: () => undefined,
            transcriptNavigationController: { setFocused: () => undefined },
            state: {
                sessions: [{ id: 's1' }],
                setNavFilter: (filter: any) => filters.push(filter),
                closeReview: () => undefined,
                closeGitSnapshotDetail: () => undefined,
                setSessionsFocused: (value: boolean) => focused.push(value)
            }
        };
        await COMMAND_HANDLERS['/sessions'](ctx, 'probe title', { command: '/sessions', matches: ['/sessions'] });
        expect(filters).toEqual([{ text: 'probe title' }]);
        expect(focused).toEqual([true]);

        // With a current project the picker stays scoped to it (the request is
        // project/workspace sessions, not every project in the database).
        const scoped: any[] = [];
        const scopedCtx: any = {
            ...ctx,
            state: {
                ...ctx.state,
                sessions: [{ id: 's1' }, { id: 's2', current: true, projectKey: 'proj-9' }],
                setNavFilter: (filter: any) => scoped.push(filter)
            }
        };
        await COMMAND_HANDLERS['/sessions'](scopedCtx, '', { command: '/sessions', matches: ['/sessions'] });
        expect(scoped).toEqual([{ projectId: 'proj-9' }]);
    }
}
