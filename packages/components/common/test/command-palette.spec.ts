import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { CommandPaletteComponent, CommandPaletteModule } from '../command-palette';
import { SearchListComponent } from '../search-list';
import { OverlayManager } from '../src/overlay-manager';

async function settle(): Promise<void> {
    for (let index = 0; index < 40; index++) await Promise.resolve();
}

@Suite('common command palette')
export class CommandPaletteTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(CommandPaletteModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }, OverlayManager]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    private async mount(): Promise<{
        ref: ComponentRef<CommandPaletteComponent>;
        palette: CommandPaletteComponent;
        manager: OverlayManager;
        rootNow: () => HTMLElement;
    }> {
        const ref = this.ctx.get(ComponentFactory).create(CommandPaletteComponent, { injector: this.ctx }) as ComponentRef<CommandPaletteComponent>;
        await ref.render();
        await settle();
        const palette = ref.instance;
        const rootNow = () => ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        return { ref, palette, manager: this.ctx.get(OverlayManager) as OverlayManager, rootNow };
    }

    @Test('opens as an overlay, filters and selects an item')
    async selectItem() {
        const { ref, palette, manager, rootNow } = await this.mount();
        let selected = '';
        let closed = 0;
        palette.items = [
            { id: 'deploy', label: 'Deploy', group: 'Run', shortcut: 'Ctrl+D' },
            { id: 'delete', label: 'Delete session', group: 'Session' }
        ];
        palette.recentIds = ['deploy'];
        palette.title = 'Command palette';
        palette.selectAction = item => { selected = item.id; };
        palette.closeAction = () => { closed += 1; };
        palette.open = true;
        await settle();
        expect(manager.size).toEqual(1);
        expect(manager.active?.kind).toEqual('palette');
        const root = rootNow();
        expect(root.querySelector('.ui-command-palette-panel')).toBeTruthy();
        expect(root.textContent).toContain('Command palette');
        expect(root.textContent).toContain('Deploy');
        expect(root.textContent).toContain('Ctrl+D');

        const list = (ref.hostView.queryAll(SearchListComponent) as ComponentRef<SearchListComponent>[])[0].instance;
        list.setQuery('de');
        list.choose(list.optionRows[1]);
        expect(selected).toEqual('delete');

        palette.close();
        expect(manager.size).toEqual(0);
        expect(closed).toEqual(1);
        ref.destroy();
    }

    @Test('overlay Escape honors beforeClose and the backdrop closes a clean palette')
    async closeContracts() {
        const { ref, palette, manager, rootNow } = await this.mount();
        let closed = 0;
        let allow = false;
        palette.items = [{ id: 'run', label: 'Run' }];
        palette.closeAction = () => { closed += 1; };
        palette.beforeCloseAction = () => allow;
        palette.open = true;
        await settle();

        expect(await manager.escape()).toEqual('blocked');
        expect(palette.open).toEqual(true);
        expect(closed).toEqual(0);

        allow = true;
        expect(await manager.escape()).toEqual('closed');
        expect(palette.open).toEqual(false);
        expect(closed).toEqual(1);
        expect(manager.size).toEqual(0);

        palette.open = true;
        await settle();
        (rootNow().querySelector('.ui-command-palette-backdrop') as HTMLElement).click();
        await settle();
        expect(palette.open).toEqual(false);
        expect(manager.size).toEqual(0);
        ref.destroy();
    }

    @Test('non-closable palettes ignore Escape and backdrop clicks')
    async nonClosable() {
        const { ref, palette, manager, rootNow } = await this.mount();
        palette.items = [{ id: 'run', label: 'Run' }];
        palette.closable = false;
        palette.open = true;
        await settle();
        (rootNow().querySelector('.ui-command-palette-backdrop') as HTMLElement).click();
        await settle();
        expect(palette.open).toEqual(true);
        expect(manager.size).toEqual(1);
        palette.closable = true;
        palette.close();
        ref.destroy();
    }
}
