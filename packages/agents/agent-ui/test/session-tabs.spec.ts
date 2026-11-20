import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { ComponentFactory, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { TabsComponent } from '@tsdi/components/common/tabs';

@Suite('session tabs')
export class SessionTabsTest {
    @Test('viewport tabs show session names and a create button')
    async rendersTabs() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            const selected: string[] = [];
            const closed: string[] = [];
            let created = 0;
            state.sessionTabsAction = {
                select: (id: string) => selected.push(id),
                create: () => { created += 1; },
                close: (id: string) => closed.push(id)
            };
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha' },
                { id: 'session-b', current: false, title: 'Beta' }
            ]);
            for (let index = 0; index < 32; index++) await Promise.resolve();
            const tabs = ref.hostView.query(TabsComponent) as any;
            expect(tabs.instance.visible).toEqual(true);
            expect(tabs.instance.items.map((tab: any) => tab.label)).toEqual([' Alpha ', ' Beta ']);
            expect(tabs.instance.items.map((tab: any) => tab.active)).toEqual([true, false]);
            const layout = ctx.get(TuiRenderer).renderToTuiLayout(ref.hostView.rootNodes as any, { width: 100 });
            const bar = layout.lines.find(line => line.includes('Alpha'));
            expect(bar).toContain('Beta');
            expect(bar).toContain('+');
            expect(bar).toContain('✕');
            // The close affordance is muted by default (workflow tab style);
            // hovering it turns it red through the shared hover animation.
            const closeColor = String(bar).match(/\x1b\[38;2;(\d+);(\d+);(\d+)m[^\x1b]*✕/);
            expect(closeColor?.slice(1).join(',')).toEqual('110,118,129');
            // Every tab reserves and paints a close affordance (the web strip
            // reveals it on hover; the terminal has no hover-reveal).
            const plainBar = String(bar).replace(/\x1b\[[0-9;]*m/g, '');
            expect(plainBar).toContain('Alpha ✕');
            expect(plainBar).toContain('Beta ✕');
            expect(plainBar).toContain(' + ');
            // The active tab is a raised surface like /web (background + bold),
            // while inactive tabs stay muted and share no active foreground.
            expect(String(bar)).toContain('\x1b[48;2;27;33;40m');
            expect(String(bar)).toContain('\x1b[38;2;201;209;217m');
            expect(String(bar)).toContain('\x1b[38;2;110;118;129m');
            tabs.instance.select('session-b');
            tabs.instance.create();
            tabs.instance.close('session-b');
            expect(selected).toEqual(['session-b']);
            expect(created).toEqual(1);
            expect(closed).toEqual(['session-b']);
            state.setConsoleOptions({ messageLayout: 'scrollback' });
            await Promise.resolve();
            expect(tabs.instance.visible).toEqual(false);
        } finally {
            await ctx.close();
        }
    }

    @Test('the active close affordance reserves cells before the next tab')
    async closeDoesNotOverlapNextTab() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha', workspace: '/work' },
                { id: 'session-b', current: false, title: 'Beta', workspace: '/work' }
            ]);
            state.setOpenSessionIds(['session-a', 'session-b']);
            for (let index = 0; index < 32; index++) await Promise.resolve();
            const surface = new TuiTerminalSurface({
                renderer: ctx.get(TuiRenderer),
                root: ref.elementRef.nativeElement,
                width: 80,
                height: 24,
                nativeScrollback: false,
                scrollViewport: true,
                scrollRegionId: 'transcript',
                footerRegionId: 'footer',
                output: { write() { /* noop */ } }
            });
            surface.render();
            const targets = surface.clickTargets.filter(target => target.y === 0);
            const close = targets.find(target => String((target.node as any)?.getAttribute?.('class') || '') === 'tab-close');
            const beta = targets.find(target => String((target.node as any)?.getAttribute?.('class') || '') === 'tab'
                && String((target.node as any)?.textContent || '').includes('Beta'));
            expect(close).toBeTruthy();
            expect(beta).toBeTruthy();
            // ✕ plus one reserved cell (wide enough for a CJK-width glyph).
            expect(close!.width).toBeGreaterThanOrEqual(2);
            expect(close!.x + close!.width).toBeLessThanOrEqual(beta!.x);
            surface.destroy();
        } finally {
            await ctx.close();
        }
    }

    @Test('terminal tabs hide an inactive close until that tab is hovered')
    async hoverRevealsInactiveClose() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha', workspace: '/work' },
                { id: 'session-b', current: false, title: 'Beta', workspace: '/work' }
            ]);
            state.setOpenSessionIds(['session-a', 'session-b']);
            for (let index = 0; index < 32; index++) await Promise.resolve();
            const surface = new TuiTerminalSurface({
                renderer: ctx.get(TuiRenderer),
                root: ref.elementRef.nativeElement,
                width: 80,
                height: 24,
                nativeScrollback: false,
                scrollViewport: true,
                scrollRegionId: 'transcript',
                footerRegionId: 'footer',
                output: { write() { /* noop */ } }
            });
            try {
                surface.render();
                const row = () => String((surface.lastRenderedLines || [])[0] || '');
                const closes = () => (row().match(/✕/g) || []).length;
                const targets = () => (surface.clickTargets || []).filter(target => target.y === 0);
                const byClass = (value: string) => targets().find(target =>
                    String((target.node as any)?.getAttribute?.('class') || '') === value);
                const closeFor = (title: string) => targets().find(target =>
                    String((target.node as any)?.getAttribute?.('class') || '') === 'tab-close'
                    && String((target.node as any)?.parentNode?.textContent || '').includes(title));
                // The active tab keeps its close; the inactive one stays blank
                // even though its cells are reserved.
                expect(closes()).toEqual(1);
                const betaLabel = targets().find(target =>
                    String((target.node as any)?.getAttribute?.('class') || '') === 'tab-label'
                    && String((target.node as any)?.textContent || '').includes('Beta'));
                expect(betaLabel).toBeTruthy();
                const betaClose = closeFor('Beta');
                expect(betaClose).toBeTruthy();
                const plus = byClass('tab-new');
                expect(plus).toBeTruthy();
                const plusX = plus!.x;
                // Hovering any cell of the tab reveals its close without moving
                // the following affordances.
                surface.dispatchMouse({ x: betaLabel!.x + 2, y: betaLabel!.y + 1, button: 35, release: false } as any);
                surface.render();
                expect(closes()).toEqual(2);
                expect(byClass('tab-new')!.x).toEqual(plusX);
                // The tab (label + ✕) is one hover unit: a single background
                // fade owned by `.tab`, not separate label/button animations.
                const paint = (surface as any).hoverPaintTarget;
                expect(String(paint?.node?.getAttribute?.('class'))).toEqual('tab');
                expect(paint.width).toBeLessThan(40);
                const paintNode = paint.node;
                // Hovering the revealed glyph keeps the same background unit
                // and only recolours the nested glyph red.
                surface.dispatchMouse({ x: betaClose!.x + 2, y: betaClose!.y + 1, button: 35, release: false } as any);
                surface.render();
                expect((surface as any).hoverPaintTarget.node).toBe(paintNode);
                expect(String((surface as any).hoverTextTarget?.node?.getAttribute?.('class'))).toEqual('tab-close');
                expect(row()).toContain('\x1b[38;2;207;152;147m');
                // Leaving the strip hides the inactive affordance again.
                surface.dispatchMouse({ x: 79, y: 1, button: 35, release: false } as any);
                surface.render();
                expect(closes()).toEqual(1);
            } finally {
                surface.destroy();
            }
        } finally {
            await ctx.close();
        }
    }

    @Test('all tabs reserve the close affordance like /web (opt-out for active-only hosts)')
    async hoverCloseAffordances() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha' },
                { id: 'session-b', current: false, title: 'Beta' }
            ]);
            const tabs = ref.hostView.query(TabsComponent) as any;
            // Default: every tab reserves the close affordance (web on hover,
            // terminal paints it directly).
            expect(tabs.instance.items.map((tab: any) => tab.showClose)).toEqual([true, 'hover']);
            // Hosts that want the old active-only behaviour can opt out.
            state.tabCloseOnHover = false;
            for (let index = 0; index < 16; index++) await Promise.resolve();
            expect(tabs.instance.items.map((tab: any) => tab.showClose)).toEqual([true, false]);
        } finally {
            await ctx.close();
        }
    }

    @Test('Ctrl+Tab cycles tabs and a closed tab can be restored')
    async keyboardTabNavigation() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const instance: any = ref.instance;
            const state: any = instance.sessionState;
            const selected: string[] = [];
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha', workspace: '/work/a' },
                { id: 'session-b', current: false, title: 'Beta', workspace: '/work/a' },
                { id: 'session-c', current: false, title: 'Gamma', workspace: '/work/a' }
            ]);
            state.setOpenSessionIds(['session-a', 'session-b', 'session-c']);
            state.configure({ sessionId: 'session-a' });
            state.sessionTabsAction = {
                select: (id: string) => {
                    selected.push(id);
                    state.configure({ sessionId: id });
                }
            };

            await instance.handleTerminalInput({ text: '', partial: false }, '\u001b[1;5I');
            expect(state.sessionId).toEqual('session-b');
            await instance.handleTerminalInput({ text: '', partial: false }, '\u001b[1;5I');
            expect(state.sessionId).toEqual('session-c');
            await instance.handleTerminalInput({ text: '', partial: false }, '\u001b[1;6I');
            expect(state.sessionId).toEqual('session-b');

            // Close Gamma (inactive), then restore it with the reopen action.
            state.sessionTabsAction.close?.('session-c');
            state.setOpenSessionIds(['session-a', 'session-b']);
            state.closedSessionTabIds = ['session-c'];
            await instance.reopenClosedSessionTab();
            expect(state.openSessionIds).toContain('session-c');
            expect(selected).toContain('session-c');
        } finally {
            await ctx.close();
        }
    }

    @Test('tabs stay on the current project and restore the recorded open set')
    async scopesAndRestoresTabs() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha', workspace: '/work/a' },
                { id: 'session-b', current: false, title: 'Beta', workspace: '/work/a' },
                { id: 'session-untitled', current: false, workspace: '/work/a' },
                { id: 'session-c', current: false, title: 'Gamma', workspace: '/work/b' }
            ]);
            const tabs = ref.hostView.query(TabsComponent) as any;
            expect(tabs.instance.items.map((tab: any) => tab.id)).toEqual(['session-a', 'session-b', 'session-untitled']);
            const untitled = tabs.instance.items.find((tab: any) => tab.id === 'session-untitled');
            expect(untitled.label).not.toContain('session-untitled');
            expect(untitled.label.trim().length).toBeGreaterThan(0);

            state.setOpenSessionIds(['session-b', 'session-a', 'session-c']);
            expect(tabs.instance.items.map((tab: any) => tab.id)).toEqual(['session-b', 'session-a']);

            state.configure({ sessionId: 'session-b' });
            expect(tabs.instance.items.find((tab: any) => tab.id === 'session-b').showClose).toEqual(true);
            expect(tabs.instance.items.every((tab: any) => !tab.label.includes('●'))).toEqual(true);
        } finally {
            await ctx.close();
        }
    }
}
