import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { ansiScreenLines, createAnsiScreenBuffer, feedAnsiScreen } from './ansi-screen';

async function settle(times = 96): Promise<void> {
    for (let index = 0; index < times; index++) {
        await Promise.resolve();
    }
}

const plain = (line: string): string => String(line || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');

function messages(prefix: string, count: number): any[] {
    return Array.from({ length: count }, (_value, index) => ({
        id: `${prefix}${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `${prefix} message ${index}`,
        createdAt: index
    }));
}

interface SessionHarness {
    ref: ComponentRef<AgentConsoleComponent>;
    instance: any;
    state: any;
    surface: TuiTerminalSurface;
    buffer: ReturnType<typeof createAnsiScreenBuffer>;
    screen(): string[];
}

/**
 * Session tabs are independent sessions of the current project. Switching a tab
 * must never show the previous tab's transcript (even while the next page is
 * still loading), must land on that session's latest message, and must not carry
 * over scroll position, new-message counters or composer drafts.
 */
@Suite('Agent console session tab isolation')
export class AgentConsoleSessionTabIsolationTest {
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

    protected async createHarness(service: Record<string, any>): Promise<SessionHarness> {
        const ref = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx });
        await ref.render();
        const instance: any = ref.instance;
        const state: any = instance.sessionState;
        (instance as any).sessionService = new Proxy({}, {
            get: (_target, prop: string) => service[prop] || (async () => [])
        });
        state.sessionTabsAction = {
            select: (id: string) => void instance.openSession(id),
            create: () => void instance.openSession(),
            close: () => undefined
        };
        state.setSessions([
            { id: 'session-a', current: true, title: 'Alpha', workspace: '/work' },
            { id: 'session-b', current: false, title: 'Beta', workspace: '/work' }
        ]);
        state.setOpenSessionIds(['session-a', 'session-b']);
        state.configure({ sessionId: 'session-a' });
        await settle();

        const buffer = createAnsiScreenBuffer(24, 90);
        const surface = new TuiTerminalSurface({
            renderer: this.ctx.get(TuiRenderer),
            root: ref.elementRef.nativeElement,
            width: 90,
            height: 24,
            nativeScrollback: false,
            scrollViewport: true,
            scrollRegionId: 'transcript',
            footerRegionId: 'footer',
            output: { write: (value: string) => feedAnsiScreen(buffer, value) }
        });
        // Bind the manually created surface to the component so per-tab scroll
        // save/restore uses the same viewport the assertions inspect.
        (instance as any).surfaceAccessor = {
            getViewportScrollOffset: () => surface.viewportScrollOffset,
            isViewportFollowing: () => surface.viewportFollowing,
            scrollViewport: (delta: number) => surface.scrollViewport(delta),
            scrollViewportToRow: (row: number) => surface.scrollViewportToRow(row),
            scrollViewportToOffset: (offset: number) => surface.scrollViewportToOffset(offset),
            scrollViewportToEdge: (edge: 'start' | 'end') => surface.scrollViewportToEdge(edge)
        };
        return {
            ref, instance, state, surface, buffer,
            screen: () => ansiScreenLines(buffer).map(plain)
        };
    }

    protected baseService(pages: Record<string, any[]>): Record<string, any> {
        return {
            ensureSession: async (sessionId?: string) => ({
                id: sessionId || 'session-a',
                archived: false,
                workspace: '/work',
                lastActiveAt: 1
            }),
            loadMessagesPage: async (sessionId: string) => ({
                messages: pages[sessionId] || [],
                hasMore: false
            }),
            listProjectSessions: async () => [],
            listSessions: async () => [
                { id: 'session-a', title: 'Alpha', workspace: '/work', updatedAt: 2 },
                { id: 'session-b', title: 'Beta', workspace: '/work', updatedAt: 1 }
            ]
        };
    }

    @Test('switching a tab never shows the previous tab transcript')
    async switchDoesNotLeakMessagesWhileLoading() {
        const aMessages = messages('alpha', 40);
        const bMessages = messages('beta', 34);
        let releaseB: (page: any) => void = () => undefined;
        let loadingB = false;
        const harness = await this.createHarness({
            ...this.baseService({ 'session-a': aMessages }),
            loadMessagesPage: (sessionId: string) => {
                if (sessionId === 'session-b') {
                    loadingB = true;
                    return new Promise(resolve => {
                        releaseB = (page: any) => resolve(page);
                    });
                }
                return Promise.resolve({ messages: aMessages, hasMore: false });
            }
        });
        try {
            harness.state.setMessages(aMessages as any);
            await settle();
            harness.surface.render();
            expect(harness.screen().some(line => line.includes('alpha message'))).toBe(true);

            const switching = harness.instance.openSession('session-b');
            for (let index = 0; index < 64 && !loadingB; index++) {
                await Promise.resolve();
            }
            expect(loadingB).toBe(true);
            // While the target page is still loading, the previous tab's
            // transcript must already be gone (no cross-tab flash).
            expect(harness.state.messages.some((m: any) => String(m.id).startsWith('alpha'))).toBe(false);
            harness.surface.render();
            expect(harness.screen().some(line => line.includes('alpha message'))).toBe(false);
            // Chrome stays pinned during the switch as well.
            expect(harness.screen()[0]).toContain('Beta');
            expect(harness.screen().some(line => line.trimStart().startsWith('>'))).toBe(true);

            releaseB({ messages: bMessages, hasMore: false });
            await switching;
            await settle();
            harness.surface.render();
            const screen = harness.screen();
            expect(harness.state.messages.every((m: any) => String(m.id).startsWith('beta'))).toBe(true);
            expect(screen.some(line => line.includes('alpha message'))).toBe(false);
            expect(screen.some(line => line.includes('beta message'))).toBe(true);
            expect(screen[0]).toContain('Beta');
            expect(screen.slice(-5).some(line => line.trimStart().startsWith('>'))).toBe(true);
        } finally {
            harness.surface.destroy();
        }
    }

    @Test('a switched tab lands on its own latest message instead of the previous scroll position')
    async switchResetsScrollAndFollowsTail() {
        const aMessages = messages('alpha', 80);
        const bMessages = messages('beta', 70);
        const harness = await this.createHarness(this.baseService({
            'session-a': aMessages,
            'session-b': bMessages
        }));
        try {
            harness.state.setMessages(aMessages as any);
            await settle();
            harness.surface.render();
            expect(harness.surface.scrollViewport(9)).toBe(true);
            harness.surface.render();
            expect(harness.surface.viewportScrollOffset).toBeGreaterThan(0);

            await harness.instance.openSession('session-b');
            await settle();
            harness.surface.render();

            expect(harness.surface.viewportScrollOffset).toEqual(0);
            expect(harness.surface.viewportFollowing).toBe(true);
            expect(harness.state.transcriptFollowing).toBe(true);
            expect(harness.state.messagesNewCount).toEqual(0);
            expect(harness.state.messagesFocused).toBe(false);
            const screen = harness.screen();
            expect(screen.some(line => line.includes('beta message 69'))).toBe(true);
            expect(screen.some(line => line.includes('alpha message'))).toBe(false);
            expect(screen.slice(-5).some(line => line.trimStart().startsWith('>'))).toBe(true);
        } finally {
            harness.surface.destroy();
        }
    }

    @Test('new-message counters and drafts belong to the tab that owns them')
    async newCountAndDraftDoNotLeakAcrossTabs() {
        const aMessages = messages('alpha', 30);
        const bMessages = messages('beta', 12);
        const harness = await this.createHarness(this.baseService({
            'session-a': aMessages,
            'session-b': bMessages
        }));
        try {
            harness.state.setMessages(aMessages as any);
            await settle();
            harness.surface.render();
            // Simulate "reading history" for the counter contract without
            // depending on the DI surface accessor used by the real host.
            harness.state.setTranscriptFollowProvider(() => false);
            harness.state.syncTranscriptFollowing();
            harness.state.appendMessage({
                id: 'alpha-extra', role: 'assistant', content: 'alpha extra', createdAt: 99
            } as any);
            await settle();
            expect(harness.state.messagesNewCount).toBeGreaterThan(0);
            harness.state.setInput('draft from alpha', 15);
            await settle();

            await harness.instance.openSession('session-b');
            await settle();
            harness.surface.render();

            expect(harness.state.messagesNewCount).toEqual(0);
            expect(harness.state.input).toEqual('');
            expect(harness.state.messages.every((m: any) => String(m.id).startsWith('beta'))).toBe(true);

            await harness.instance.openSession('session-a');
            await settle();
            harness.surface.render();
            expect(harness.state.messages.every((m: any) => String(m.id).startsWith('alpha'))).toBe(true);
            // Each tab keeps its own composer draft.
            expect(harness.state.input).toEqual('draft from alpha');
            expect(harness.screen()[0]).toContain('Alpha');
        } finally {
            harness.surface.destroy();
        }
    }

    @Test('each tab keeps its own scroll position, draft and message state')
    async eachTabKeepsOwnScrollAndDraft() {
        const aMessages = messages('alpha', 90);
        const bMessages = messages('beta', 80);
        const harness = await this.createHarness(this.baseService({
            'session-a': aMessages,
            'session-b': bMessages
        }));
        try {
            harness.state.setMessages(aMessages as any);
            await settle();
            harness.surface.render();
            harness.state.setInput('draft alpha', 11);
            expect(harness.surface.scrollViewport(12)).toBe(true);
            harness.surface.render();
            const aOffset = harness.surface.viewportScrollOffset;
            expect(aOffset).toBeGreaterThan(0);

            // First visit to B: no state inherited from A.
            await harness.instance.openSession('session-b');
            await settle();
            harness.surface.render();
            expect(harness.state.input).toEqual('');
            expect(harness.surface.viewportScrollOffset).toEqual(0);
            expect(harness.surface.viewportFollowing).toBe(true);

            harness.state.setInput('draft beta', 10);
            expect(harness.surface.scrollViewport(30)).toBe(true);
            harness.surface.render();
            const bOffset = harness.surface.viewportScrollOffset;
            expect(bOffset).toBeGreaterThan(aOffset);

            // Back to A: its own draft and reading row, not B's.
            await harness.instance.openSession('session-a');
            await settle();
            harness.surface.render();
            expect(harness.state.input).toEqual('draft alpha');
            expect(harness.surface.viewportScrollOffset).toEqual(aOffset);
            expect(harness.surface.viewportFollowing).toBe(false);

            // Back to B: B's own draft and reading row.
            await harness.instance.openSession('session-b');
            await settle();
            harness.surface.render();
            expect(harness.state.input).toEqual('draft beta');
            expect(harness.surface.viewportScrollOffset).toEqual(bOffset);
            expect(harness.surface.viewportFollowing).toBe(false);
        } finally {
            harness.surface.destroy();
        }
    }
}
