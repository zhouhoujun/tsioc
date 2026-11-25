import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TransferComponent, TransferModule } from '../transfer';

@Component({
    selector: 'transfer-host',
    imports: [TransferComponent],
    template: `
    <ui-transfer :items="items" :targetKeys="targets" sourceTitle="Available" targetTitle="Chosen"
        emptyLabel="Empty" :changeAction="onChange"></ui-transfer>`
})
class TransferHostComponent {
    targets = ['c'];
    lastDirection = '';
    lastMoved: string[] = [];
    items = [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta', description: 'second' },
        { key: 'c', label: 'Gamma' },
        { key: 'd', label: 'Delta', disabled: true }
    ];
    onChange = (next: string[], direction: string, moved: string[]) => {
        this.targets = next;
        this.lastDirection = direction;
        this.lastMoved = moved;
    };
}

@Suite('common transfer')
export class TransferTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TransferHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, TransferModule],
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

    protected async mount(): Promise<{ root: HTMLElement; host: TransferHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(TransferHostComponent, {
            injector: this.ctx
        }) as ComponentRef<TransferHostComponent>;
        await ref.render();
        await Promise.resolve();
        const transfer = ref.hostView.query(TransferComponent) as ComponentRef<TransferComponent>;
        return { root: transfer.hostView.rootNodes[0] as HTMLElement, host: ref.instance as TransferHostComponent };
    }

    @Test('moves selected items between panes')
    async movesSelected() {
        const { root, host } = await this.mount();
        const sourceItems = () => Array.from(root.querySelectorAll('.ui-transfer-pane.is-source .ui-transfer-item') as NodeListOf<HTMLElement>);
        const targetItems = () => Array.from(root.querySelectorAll('.ui-transfer-pane.is-target .ui-transfer-item') as NodeListOf<HTMLElement>);
        const actions = () => Array.from(root.querySelectorAll('.ui-transfer-action') as NodeListOf<HTMLElement>);
        const text = (element: HTMLElement) => (element.textContent || '').trim().replace(/\s+/g, ' ');

        expect(root.textContent).toContain('Available (3)');
        expect(root.textContent).toContain('Chosen (1)');
        expect(sourceItems().map(text)).toEqual(['Alpha', 'Beta second', 'Delta']);
        expect(targetItems().map(text)).toEqual(['Gamma']);
        expect(actions()[0].getAttribute('aria-disabled')).toEqual('true');

        sourceItems()[0].click();
        await Promise.resolve();
        expect(sourceItems()[0].getAttribute('aria-selected')).toEqual('true');
        expect(actions()[0].getAttribute('aria-disabled')).toEqual('false');

        actions()[0].click();
        await Promise.resolve();
        expect(host.targets).toEqual(['a', 'c']);
        expect(host.lastDirection).toEqual('right');
        expect(host.lastMoved).toEqual(['a']);
        expect(targetItems().map(text)).toEqual(['Alpha', 'Gamma']);

        actions()[2].click();
        await Promise.resolve();
        expect(host.targets).toEqual(['a', 'b', 'c']);
        expect(sourceItems().map(text)).toEqual(['Delta']);

        actions()[3].click();
        await Promise.resolve();
        expect(host.targets).toEqual([]);
        expect(sourceItems().map(text)).toEqual(['Alpha', 'Beta second', 'Gamma', 'Delta']);
    }

    @Test('keyboard selects and moves; disabled rows stay inert')
    async keyboardAndDisabled() {
        const { root, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const sourceItems = () => Array.from(root.querySelectorAll('.ui-transfer-pane.is-source .ui-transfer-item') as NodeListOf<HTMLElement>);
        const actions = () => Array.from(root.querySelectorAll('.ui-transfer-action') as NodeListOf<HTMLElement>);

        const delta = sourceItems().find(item => (item.textContent || '').trim() === 'Delta') as HTMLElement;
        delta.click();
        await Promise.resolve();
        expect(delta.getAttribute('aria-selected')).toEqual('false');

        sourceItems()[1].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        await Promise.resolve();
        expect(sourceItems()[1].getAttribute('aria-selected')).toEqual('true');
        actions()[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await Promise.resolve();
        expect(host.lastMoved).toEqual(['b']);
        expect(host.targets).toEqual(['b', 'c']);
    }
}
