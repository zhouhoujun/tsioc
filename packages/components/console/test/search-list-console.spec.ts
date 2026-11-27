import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule } from '../src';
import { TuiRenderer } from '../src/tui';
import { SearchListComponent, SearchListModule } from '@tsdi/components/common/search-list';
import { CommandPaletteComponent, CommandPaletteModule } from '@tsdi/components/common/command-palette';
import { OverlayManager } from '@tsdi/components/common/src/overlay-manager';

@Component({
    selector: 'search-list-console-host',
    imports: [SearchListComponent],
    template: `<ui-search-list :items="items" :recentIds="['deploy']" ariaLabel="Commands"
        :selectAction="onSelect"></ui-search-list>`
})
class SearchListConsoleHostComponent {
    items = [
        { id: 'deploy', label: 'Deploy', group: 'Run', shortcut: 'Ctrl+D', description: 'Run command' },
        { id: 'delete', label: 'Delete session', group: 'Session' }
    ];
    selected = '';
    onSelect = (item: any) => { this.selected = item.id; };
}

@Suite('common search list console rendering')
export class SearchListConsoleTest {
    @Test('paints grouped rows and keeps keyboard activation in the shared model')
    async rendersAndSelects() {
        const ctx = await Application.run(SearchListConsoleHostComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule, SearchListModule]
        });
        try {
            const ref = ctx.runners.getRef(SearchListConsoleHostComponent) as ComponentRef<SearchListConsoleHostComponent>;
            await ref.render();
            await Promise.resolve();
            const output = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');
            expect(output).toContain('Recent');
            expect(output).toContain('Deploy');
            expect(output).toContain('Ctrl+D');
            expect(output).toContain('Session');

            const list = (ref.hostView.queryAll(SearchListComponent) as ComponentRef<SearchListComponent>[])[0].instance;
            list.onKeydown({ key: 'ArrowDown', preventDefault() { } });
            list.onKeydown({ key: 'Enter', preventDefault() { } });
            expect(ref.instance.selected).toEqual('delete');

            list.rowLayout = 'inline';
            await Promise.resolve();
            const inline = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');
            expect(inline).toMatch(/Deploy\s{2,}Run command/);
        } finally {
            await ctx.close();
        }
    }

    @Test('renders the command palette overlay through the console renderer')
    async rendersPalette() {
        const ctx = await Application.run(CommandPaletteModule, {
            deps: [ConsoleTemplateModule, ComponentsModule, SearchListModule],
            providers: [OverlayManager]
        });
        try {
            const ref = ctx.get(ComponentFactory) as ComponentFactory;
            const paletteRef = ref.create(CommandPaletteComponent, { injector: ctx }) as ComponentRef<CommandPaletteComponent>;
            await paletteRef.render();
            await Promise.resolve();
            const palette = paletteRef.instance;
            palette.title = 'Command palette';
            palette.hint = 'enter run   esc close';
            palette.items = [{ id: 'deploy', label: 'Deploy', group: 'Run', shortcut: 'Ctrl+D' }];
            palette.open = true;
            await Promise.resolve();
            const output = new TuiRenderer().renderToLines(paletteRef.hostView.rootNodes[0] as any).join('\n');
            expect(output).toContain('Command palette');
            expect(output).toContain('Deploy');
            expect(output).toContain('Ctrl+D');
            expect(output).toContain('enter run');
            paletteRef.destroy();
        } finally {
            await ctx.close();
        }
    }
}
