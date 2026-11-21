import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { AgentConsoleSessionsPanelComponent } from '../src/AgentConsolePanels';
import { formatSessionAge, formatSessionHint, resolveSessionRecencyBucket } from '../src/AgentConsoleFormatters';
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

    @Test('seconds-based timestamps are normalized instead of rendering 1970')
    secondsTimestamp() {
        const now = Date.UTC(2026, 9, 27, 12, 0, 0);
        const seconds = Math.floor((now - 5 * 60_000) / 1000);
        expect(formatSessionAge(seconds, now)).toEqual(' · 5m');
        expect(formatSessionAge(seconds, now)).not.toContain('1970');
    }

    @Test('appends the active filter to the hint')
    sessionHint() {
        expect(formatSessionHint('esc', undefined)).toEqual('esc');
        expect(formatSessionHint('esc', '  probe ')).toEqual('esc · filter: probe');
    }

    @Test('groups sessions by recency buckets')
    recencyBuckets() {
        const now = new Date(2026, 9, 27, 12, 0, 0).getTime();
        expect(resolveSessionRecencyBucket(now - 60_000, now)).toEqual('today');
        expect(resolveSessionRecencyBucket(now - 24 * HOUR, now)).toEqual('yesterday');
        expect(resolveSessionRecencyBucket(now - 3 * 24 * HOUR, now)).toEqual('previous7Days');
        expect(resolveSessionRecencyBucket(now - 30 * 24 * HOUR, now)).toEqual('older');
        expect(resolveSessionRecencyBucket(0, now)).toEqual('older');
        // Second-based timestamps are normalized, not treated as 1970.
        expect(resolveSessionRecencyBucket(Math.floor((now - 60_000) / 1000), now)).toEqual('today');
    }

    @Test('nav filtering reuses its result until the filter or sessions change')
    navFilterCache() {
        const state = sessionsState();
        state.setNavFilter({ text: 'old' });
        const first = state.navFilteredSessions;
        expect(first.map(item => item.id)).toEqual(['chat-old']);
        expect(state.navFilteredSessions).toBe(first);
        // Typing another query invalidates the cached projection.
        state.setNavFilter({ text: 'new' });
        const second = state.navFilteredSessions;
        expect(second.map(item => item.id)).toEqual(['chat-new']);
        expect(second).not.toBe(first);
        // A refreshed session list invalidates it even with the same query.
        state.setSessions([
            { id: 'chat-new', current: true, title: 'New task', updatedAt: Date.now(), messageCount: 4 } as any,
            { id: 'chat-old', current: false, title: 'Old task', updatedAt: Date.now(), messageCount: 4 } as any
        ]);
        const third = state.navFilteredSessions;
        expect(third.map(item => item.id)).toEqual(['chat-new']);
        expect(third).not.toBe(second);
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

    @Test('/sessions opens a searchable dialog scoped to the current project')
    async commandPrefilters() {
        const calls: Array<{ title: string; options: any[]; hint?: string }> = [];
        const opened: string[] = [];
        const now = Date.now();
        const ctx: any = {
            refreshSessions: async () => undefined,
            notify: () => undefined,
            state: {
                sessions: [
                    { id: 's1', current: true, title: 'Probe title', projectKey: 'proj-9', updatedAt: now - 60_000, messageCount: 2 },
                    { id: 's2', current: false, title: 'Other project', projectKey: 'proj-8', updatedAt: now - 120_000, messageCount: 1 }
                ],
                consoleOptions: { selectHint: 'type to filter' }
            },
            select: async (title: string, options: any[], _index: number, hint?: string) => {
                calls.push({ title, options, hint });
                return options[0]?.value;
            },
            openSession: async (id: string) => { opened.push(id); }
        };
        await COMMAND_HANDLERS['/sessions'](ctx, '', { command: '/sessions', matches: ['/sessions'] });
        expect(calls.length).toEqual(1);
        expect(calls[0].title).toEqual('Sessions');
        // Scoped to the current project, not every project in the database.
        expect(calls[0].options.map(option => option.value)).toEqual(['s1']);
        expect(calls[0].options[0].label).toContain('Probe title');
        expect(calls[0].options[0].label).toContain('[current]');
        // Grouped by recency so a long project list reads like opencode.
        expect(calls[0].options[0].group).toEqual('Today');
        expect(opened).toEqual(['s1']);

        await COMMAND_HANDLERS['/sessions'](ctx, 'other', { command: '/sessions', matches: ['/sessions'] });
        // Query pre-filters the scoped list; project scope still applies.
        expect(calls.length).toEqual(1);
    }
}
