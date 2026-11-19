import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { flattenProjectSessions } from '../src/AgentConsoleProjectProjection';

async function settle(times = 64): Promise<void> {
    for (let index = 0; index < times; index++) {
        await Promise.resolve();
    }
}

@Suite('session/project dialogs')
export class SessionProjectDialogsTest {
    ctx!: ApplicationContext;
    ref!: ComponentRef<AgentConsoleComponent>;
    surface!: TuiTerminalSurface;
    instance!: any;
    state!: any;
    projectGroups: any[] = [];

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        this.ref = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx });
        await this.ref.render();
        this.instance = this.ref.instance;
        this.state = this.instance.sessionState;
        this.projectGroups = [{
            projectKey: 'proj-a', projectId: 'proj-a', label: 'Project A', workspace: '/w',
            sessionCount: 2, lastActiveAt: 2000,
            sessions: [
                { id: 's0', current: true, title: 'Fix login flow', messageCount: 12, lastActiveAt: 2000 },
                { id: 's1', current: false, title: 'Refactor runtime', messageCount: 8, lastActiveAt: 1500 }
            ]
        }, {
            projectKey: 'proj-b', projectId: 'proj-b', label: 'Project B', workspace: '/w',
            sessionCount: 1, lastActiveAt: 1000,
            sessions: [{ id: 's2', current: false, title: 'Docs pass', messageCount: 5, lastActiveAt: 1000 }]
        }];
        this.instance.sessionService = new Proxy({}, {
            get: (_target, prop: string) => {
                const stub: any = {
                    ensureSession: async (id?: string) => ({ id: id || 's0', archived: false, workspace: '/w' }),
                    loadMessagesPage: async () => ({ messages: [], hasMore: false }),
                    listProjectSessions: async () => this.projectGroups,
                    listSessions: async () => [],
                    listSections: async () => [],
                    listUserMessages: async () => [],
                    listApprovals: async () => [],
                    listCodingTasks: async () => [],
                    loadTodoPlan: async () => []
                };
                return stub[prop] || (async () => undefined);
            }
        });
        this.state.configure({ sessionId: 's0', workspace: '/w' });
        this.surface = new TuiTerminalSurface({
            renderer: this.ctx.get(TuiRenderer),
            root: this.ref.elementRef.nativeElement,
            width: 100,
            height: 32,
            nativeScrollback: false,
            scrollViewport: true,
            scrollRegionId: 'transcript',
            footerRegionId: 'footer',
            output: { write() {} }
        });
        this.instance.surfaceAccessor = {
            getViewportScrollOffset: () => this.surface.viewportScrollOffset,
            isViewportFollowing: () => this.surface.viewportFollowing,
            scrollViewport: (delta: number) => this.surface.scrollViewport(delta),
            scrollViewportToRow: (row: number) => this.surface.scrollViewportToRow(row),
            scrollViewportToOffset: (offset: number) => this.surface.scrollViewportToOffset(offset),
            queueViewportOffset: (offset: number) => this.surface.queueViewportOffset(offset),
            scrollViewportToEdge: (edge: 'start' | 'end') => this.surface.scrollViewportToEdge(edge),
            invalidateRenderCache: () => this.surface.invalidateRenderCache(),
            beginRenderBatch: () => this.surface.beginRenderBatch(),
            endRenderBatch: () => this.surface.endRenderBatch(),
            getLastRenderedLines: () => this.surface.lastRenderedLines,
            getTerminalSize: () => ({ cols: 100, rows: 32 })
        };
    }

    @After()
    async clean() {
        this.surface?.destroy();
        await this.ctx?.close();
    }

    @Test('/sessions lists the project sessions without a dead load-more row')
    async sessionsPanel() {
        await this.instance.handleCommand('/sessions');
        await settle();
        this.surface.render();
        const frame = this.surface.lastRenderedLines.join('\n');
        expect(frame).toContain('Fix login flow');
        expect(frame).toContain('Refactor runtime');
        expect(frame).toContain('Project A');
        expect(frame).not.toContain('Load more');
    }

    @Test('/projects offers every project and no load-more row')
    async projectsDialog() {
        void this.instance.handleCommand('/projects');
        await settle();
        this.surface.render();
        const options = (this.state.selectMenu?.options || []).map((option: any) => option.label);
        expect(options).toEqual(['Project A (2)', 'Project B (1)']);
        expect(this.surface.lastRenderedLines.join('\n')).not.toContain('Load more');
        await this.state.confirmSelectMenu('proj-a');
        await settle();
        // The second picker names the project label, not its raw key.
        expect(this.state.selectMenu?.title).toEqual('Sessions in Project A');
        expect((this.state.selectMenu?.options || []).map((option: any) => option.value)).toEqual(['s0', 's1']);
        // Esc in the session picker returns to the project list, so close the
        // remaining project picker to finish the flow.
        await this.state.cancelSelectMenu();
        await settle();
        await this.state.cancelSelectMenu();
        await settle();
    }

    @Test('archived sessions carry a badge in the /sessions panel')
    async archivedBadge() {
        this.projectGroups[0].sessions[1].archived = true;
        await this.instance.handleCommand('/sessions');
        await settle();
        this.surface.render();
        const frame = this.surface.lastRenderedLines.join('\n');
        expect(frame).toContain('Refactor runtime');
        expect(frame).toContain('[archived]');
    }

    @Test('/projects: Esc in the session picker returns to the project list')
    async projectsEscReturnsToProjects() {
        const pending = this.instance.handleCommand('/projects');
        await settle();
        expect(this.state.selectMenu?.title).toEqual('Projects');
        await this.state.confirmSelectMenu('proj-a');
        await settle();
        expect(this.state.selectMenu?.title).toEqual('Sessions in Project A');
        // Esc (cancel) in the second picker goes back one level instead of
        // closing the whole /projects flow.
        await this.state.cancelSelectMenu();
        await settle();
        expect(this.state.selectMenu?.title).toEqual('Projects');
        expect((this.state.selectMenu?.options || []).map((option: any) => option.value))
            .toEqual(['proj-a', 'proj-b']);
        // Esc again closes the flow.
        await this.state.cancelSelectMenu();
        expect(await pending).toEqual(true);
        expect(this.state.selectMenu).toBeUndefined();
    }

    @Test('/sessions explains an empty search instead of showing a blank picker')
    async emptySearchState() {
        await this.instance.handleCommand('/sessions zzz-missing');
        await settle();
        this.surface.render();
        expect(this.surface.lastRenderedLines.join('\n')).toContain('no sessions match "zzz-missing"');
    }

    @Test('a tall dialog keeps its title and close affordance inside the viewport')
    async tallDialogClipping() {
        this.state.openSelectMenu(
            'Very tall dialog',
            Array.from({ length: 40 }, (_value, index) => ({ label: `Choice ${index + 1}`, value: `v${index}` })),
            0,
            'up/down move   enter confirm   esc close'
        );
        await settle();
        this.surface.render();
        const lines = this.surface.lastRenderedLines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
        const titleRow = lines.findIndex(line => line.includes('Very tall dialog'));
        const topBorderRow = lines.findIndex(line => line.includes('╭'));
        const bottomBorderRow = lines.findIndex(line => line.includes('╰'));
        const inputRow = lines.findIndex(line => line.includes('Ask code or files'));
        expect(titleRow).toBeGreaterThan(0);
        // Window position and hint stay readable when the list is clipped.
        expect(lines.join('\n')).toContain('1-12/40');
        expect(lines[titleRow]).not.toContain('Choice');
        expect(lines.some(line => line.includes('esc close'))).toEqual(true);
        // The ✕ rides on the top border so the close affordance never scrolls.
        expect(lines[topBorderRow]).toContain('✕');
        expect(bottomBorderRow).toBeLessThan(inputRow);
        // No option is painted below the dialog (never covers the composer).
        const optionRows = lines.map((line, index) => (line.includes('Choice') ? index : -1)).filter(index => index >= 0);
        expect(Math.max(...optionRows)).toBeLessThan(bottomBorderRow);
        // Clicking the ✕ dismisses without selecting anything.
        const closeColumn = lines[topBorderRow].indexOf('✕') + 1;
        this.surface.dispatchMouse({ button: 0, x: closeColumn, y: topBorderRow + 1, release: false });
        this.surface.dispatchMouse({ button: 0, x: closeColumn, y: topBorderRow + 1, release: true });
        await settle();
        expect(this.state.selectMenu).toBeUndefined();
    }

    @Test('project groups without a sessions array do not crash the picker')
    async tolerantGroups() {
        expect(flattenProjectSessions([{ projectKey: 'x', label: 'X', workspace: '/w', sessionCount: 0, lastActiveAt: 1 } as any]))
            .toEqual([]);
    }

    @Test('a missing project-group payload degrades to an empty picker')
    async tolerantPayload() {
        expect(flattenProjectSessions(undefined as any)).toEqual([]);
        expect(flattenProjectSessions(null as any)).toEqual([]);
    }
}
