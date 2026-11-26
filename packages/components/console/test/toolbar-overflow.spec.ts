import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule, TuiTerminalSurface } from '../src';
import { TuiRenderer } from '../src/tui';
import { ToolbarComponent, ToolbarModule } from '@tsdi/components/common/toolbar';

@Component({
    selector: 'toolbar-overflow-console-host',
    imports: [ToolbarComponent],
    template: `<ui-toolbar :items="items" :maxVisible="2" :action="onAction"></ui-toolbar>`
})
class ToolbarOverflowConsoleHostComponent {
    picked = '';
    items = [
        { id: 'run', label: 'Run' },
        { id: 'stop', label: 'Stop', disabled: true },
        { id: 'theme', label: 'Theme' },
        { id: 'copy', label: 'Copy' }
    ];
    onAction = (item: { id?: string }) => { this.picked = String(item.id || ''); };
}

@Suite('common toolbar overflow console')
export class ToolbarOverflowConsoleTest {
    @Test('opens and selects overflow commands from the terminal surface')
    async overflows() {
        const ctx = await Application.run(ToolbarOverflowConsoleHostComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule, ToolbarModule]
        });
        try {
            const ref = ctx.runners.getRef(ToolbarOverflowConsoleHostComponent) as ComponentRef<ToolbarOverflowConsoleHostComponent>;
            await ref.render();
            await Promise.resolve();
            const host = ref.instance as ToolbarOverflowConsoleHostComponent;
            const root = ref.hostView.rootNodes[0] as any;
            const initial = new TuiRenderer().renderToLines(root).join('\n');
            expect(initial).toContain('Run');
            expect(initial).toContain('…');
            expect(initial).not.toContain('Theme');

            const surface = new TuiTerminalSurface({
                renderer: new TuiRenderer(),
                root,
                width: 80,
                height: 24,
                output: { write() { } }
            });
            const trigger = root.querySelector('.ui-toolbar-overflow-trigger');
            trigger.focus();
            expect(surface.dispatchKey({ key: 'ArrowDown' })).toEqual(true);
            for (let index = 0; index < 4; index++) await Promise.resolve();
            expect(trigger.getAttribute('aria-expanded')).toEqual('true');
            const open = new TuiRenderer().renderToLines(root).join('\n');
            expect(open).toContain('Theme');
            expect(open).toContain('Copy');
            expect(surface.dispatchKey({ key: 'ArrowDown' })).toEqual(true);
            await Promise.resolve();
            expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
            await Promise.resolve();
            expect(host.picked).toEqual('copy');
            expect(trigger.getAttribute('aria-expanded')).toEqual('false');
        } finally {
            await ctx.close();
        }
    }
}
