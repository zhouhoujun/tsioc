import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AnimationClock, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { JSDOM } from 'jsdom';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

async function settle(): Promise<void> {
    for (let index = 0; index < 120; index++) await Promise.resolve();
}

/** Renderer clock stand-in: tests decide when time advances. */
class ManualAnimationClock extends AnimationClock {
    readonly listeners = new Set<() => void>();

    subscribe(listener: () => void): void {
        this.listeners.add(listener);
    }

    unsubscribe(listener: () => void): void {
        this.listeners.delete(listener);
    }

    tick(): void {
        for (const listener of [...this.listeners]) {
            listener();
        }
    }
}

@Suite('console toast strip rendering')
export class ToastStripRenderingTest {
    ctx!: ApplicationContext;
    dom!: JSDOM;

    @Test('a timed toast appears and disappears from the rendered strip')
    async rendersAndClears() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        const clock = new ManualAnimationClock();
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [
                { provide: DOCUMENT, useValue: this.dom.window.document },
                { provide: AnimationClock, useValue: clock }
            ]
        });
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        await settle();
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelectorAll === 'function') as any;

        (ref.instance as any).notify('Copied selected message.', 80);
        await settle();
        const toasts = Array.from(root.querySelectorAll('.console-toast')) as any[];
        expect(toasts.length).toEqual(1);
        expect(toasts[0].textContent).toContain('Copied selected message.');

        // The ✕ affordance closes the toast by hand (callback inputs bind to the
        // parent proxy, so the state write must stay reactive).
        toasts[0].querySelector('.toast-close').click();
        await settle();
        expect(ref.instance.sessionState.toasts).toEqual([]);
        expect(root.querySelectorAll('.console-toast').length).toEqual(0);

        (ref.instance as any).notify('Copied again.', 60);
        await settle();
        expect(root.querySelectorAll('.console-toast').length).toEqual(1);
        // Auto-dismiss rides on the shared renderer clock: no business timer
        // may remove it until the clock ticks past the deadline.
        await new Promise(resolve => setTimeout(resolve, 120));
        await settle();
        expect(root.querySelectorAll('.console-toast').length).toEqual(1);
        clock.tick();
        await settle();
        expect(root.querySelectorAll('.console-toast').length).toEqual(0);
    }

    @After()
    async clean() {
        await this.ctx.close();
        this.dom?.window.close();
        if (global.gc) global.gc();
    }
}
