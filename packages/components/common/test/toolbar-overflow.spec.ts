import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ToolbarComponent, ToolbarModule } from '../toolbar';

@Component({
    selector: 'toolbar-overflow-host',
    imports: [ToolbarComponent],
    template: `<ui-toolbar :items="items" :maxVisible="2" :action="onAction"></ui-toolbar>`
})
class ToolbarOverflowHostComponent {
    picked: string[] = [];
    items = [
        { id: 'run', label: 'Run' },
        { id: 'stop', label: 'Stop', disabled: true },
        { id: 'theme', label: 'Theme' },
        { id: 'copy', label: 'Copy' }
    ];
    onAction = (item: { id?: string }) => { this.picked.push(String(item.id || '')); };
}

@Suite('common toolbar overflow')
export class ToolbarOverflowTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ToolbarOverflowHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ToolbarModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<{ root: HTMLElement; host: ToolbarOverflowHostComponent; toolbar: ToolbarComponent; component: ComponentRef<ToolbarComponent>; hostRoot: HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(ToolbarOverflowHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ToolbarOverflowHostComponent>;
        await ref.render();
        await Promise.resolve();
        const instance = ref.hostView.query(ToolbarComponent) as ComponentRef<ToolbarComponent>;
        const root = instance.hostView.rootNodes[0] as HTMLElement;
        return {
            root,
            hostRoot: (instance.instance as any).elementRef?.nativeElement || root,
            host: ref.instance as ToolbarOverflowHostComponent,
            toolbar: instance.instance,
            component: instance
        };
    }

    @Test('collapses commands into an overflow menu and dispatches picks')
    async overflows() {
        const { hostRoot, host, toolbar } = await this.mount();
        const root = hostRoot;
        const doc = this.ctx.get(DOCUMENT) as Document;
        doc.body.appendChild(root);
        const trigger = root.querySelector('.ui-toolbar-overflow-trigger') as HTMLElement;
        const visible = Array.from(root.querySelectorAll('.ui-toolbar-entry > .ui-toolbar-item:not(.ui-toolbar-overflow-trigger)'))
            .map(item => item.textContent?.trim());
        expect(visible).toEqual(['Run']);
        expect(toolbar.overflowItems.map(item => item.label)).toEqual(['Stop', 'Theme', 'Copy']);
        expect(trigger.getAttribute('aria-haspopup')).toEqual('menu');
        expect(trigger.getAttribute('aria-expanded')).toEqual('false');

        trigger.click();
        await Promise.resolve();
        expect(trigger.getAttribute('aria-expanded')).toEqual('true');
        const menuItems = () => Array.from(root.querySelectorAll('.ui-toolbar-overflow-item') as NodeListOf<HTMLElement>);
        expect(menuItems().map(item => item.textContent?.trim())).toEqual(['Stop', 'Theme', 'Copy']);

        menuItems()[1].click();
        await Promise.resolve();
        expect(host.picked).toEqual(['theme']);
        expect(trigger.getAttribute('aria-expanded')).toEqual('false');

        trigger.focus();
        trigger.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(trigger.getAttribute('aria-expanded')).toEqual('true');
        expect(doc.activeElement?.textContent?.trim()).toEqual('Theme');
        (doc.activeElement as HTMLElement).dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(doc.activeElement?.textContent?.trim()).toEqual('Copy');
        (doc.activeElement as HTMLElement).dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(trigger.getAttribute('aria-expanded')).toEqual('false');
        expect(doc.activeElement === trigger).toEqual(true);
        root.remove();
    }

    @Test('reorders dragged command items through the host callback')
    async reorderDrag() {
        const { toolbar } = await this.mount();
        let received: any[] = [];
        toolbar.reorderAction = (items, id, targetId) => { received = [items.map(item => item.id), id, targetId]; };
        const commands = (toolbar as any).commandItems;
        toolbar.dragStart(commands[0], { preventDefault() { } });
        toolbar.dropOn(commands[2], { preventDefault() { } });
        expect(received[1]).toEqual(commands[0].key);
        expect(received[2]).toEqual(commands[2].key);
        expect(received[0][0]).toEqual('stop');
        expect(received[0][1]).toEqual('theme');
        expect(received[0][2]).toEqual('run');
    }

    @Test('keeps every command visible without a maxVisible limit')
    async noOverflow() {
        const { toolbar } = await this.mount();
        toolbar.maxVisible = 100;
        await Promise.resolve();
        expect(toolbar.maxVisible).toEqual(100);
        expect(toolbar.hasOverflow).toEqual(false);
        expect(toolbar.overflowItems).toEqual([]);
        expect(toolbar.displayItems.filter(item => item.kind === 'item').length).toEqual(4);
    }
}
