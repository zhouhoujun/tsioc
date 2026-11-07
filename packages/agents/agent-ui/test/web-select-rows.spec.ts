import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { JSDOM } from 'jsdom';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

async function settle(): Promise<void> {
    for (let index = 0; index < 160; index++) await Promise.resolve();
}

/**
 * Regression: the shared select menu paints a `<select>` whose options only the
 * console renderer understands. The browser got an empty control (and a stray
 * ✕), so no menu row was visible or clickable. The component now also renders
 * the same window as real rows for DOM hosts.
 */
@Suite('web select menu rows')
export class WebSelectRowsTest {
    ctx!: ApplicationContext;
    dom!: JSDOM;

    @Test('renders the option window and selecting a row closes the menu')
    async rendersRowsAndSelects() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        await settle();
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelectorAll === 'function') as any;

        ref.instance.sessionState.openSelectMenu('Security level', [
            { label: 'ask', value: 'ask', description: 'prompt for sensitive tools' },
            { label: 'auto', value: 'auto', description: 'approve and sandbox' }
        ], 0, 'up/down move, enter accept');
        await ref.render();
        await settle();

        // The console keeps two select panels (suggestions/commands); only one is
        // visible, and both render the same state rows.
        const rows = (Array.from(root.querySelectorAll('.select-rows .select-option')) as any[]).slice(0, 2);
        expect(rows.map(row => row.querySelector('.select-option-label')?.textContent)).toEqual(['ask', 'auto']);
        expect(rows[0].getAttribute('aria-selected')).toEqual('true');
        expect(rows[1].getAttribute('aria-selected')).toEqual('false');
        expect(root.querySelector('.select-rows .select-title')?.textContent).toContain('Security level');
        expect(root.querySelector('.select-rows .select-hint')?.textContent).toContain('enter accept');

        rows[1].click();
        await settle();
        expect(ref.instance.sessionState.selectMenu).toBeFalsy();
    }

    @After()
    async clean() {
        await this.ctx.close();
        this.dom?.window.close();
        if (global.gc) global.gc();
    }
}
