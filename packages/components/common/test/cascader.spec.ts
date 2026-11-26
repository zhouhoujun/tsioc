import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { CascaderComponent, CascaderModule } from '../cascader';

@Component({
    selector: 'cascader-host',
    imports: [CascaderComponent],
    template: `<ui-cascader :options="options" :value="path" ariaLabel="Region"
        :changeAction="onPath"></ui-cascader>`
})
class CascaderHostComponent {
    path: string[] = [];
    picked: string[] = [];
    options = [
        { label: 'A', value: 'a', children: [
            { label: 'A1', value: 'a1' },
            { label: 'A2', value: 'a2', disabled: true }
        ] },
        { label: 'B', value: 'b' }
    ];
    onPath = (path: string[]) => { this.path = path; this.picked = path; };
}

@Suite('common cascader')
export class CascaderTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(CascaderHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, CascaderModule],
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

    protected async mount(): Promise<{ root: HTMLElement; host: CascaderHostComponent; cascader: ComponentRef<CascaderComponent> }> {
        const ref = this.ctx.get(ComponentFactory).create(CascaderHostComponent, {
            injector: this.ctx
        }) as ComponentRef<CascaderHostComponent>;
        await ref.render();
        await Promise.resolve();
        const cascader = ref.hostView.query(CascaderComponent) as ComponentRef<CascaderComponent>;
        return { root: cascader.hostView.rootNodes[0] as HTMLElement, host: ref.instance as CascaderHostComponent, cascader };
    }

    @Test('opens columns, selects a leaf and closes')
    async selectsPath() {
        const { root, host, cascader } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const options = () => Array.from(root.querySelectorAll('.ui-cascader-option') as NodeListOf<HTMLElement>);

        expect(root.getAttribute('role')).toEqual('combobox');
        expect(root.textContent).toContain('Select…');
        (root.querySelector('.ui-cascader-trigger') as HTMLElement).click();
        await Promise.resolve();
        expect(root.getAttribute('aria-expanded')).toEqual('true');
        expect(root.querySelectorAll('.ui-cascader-column').length).toEqual(1);
        expect(root.querySelector('.ui-cascader-column-title')?.textContent).toEqual('Region');
        expect(options().map(item => item.textContent?.trim())).toEqual(['A▸', 'B']);

        options()[0].click();
        await Promise.resolve();
        expect(root.querySelectorAll('.ui-cascader-column').length).toEqual(2);
        expect(root.querySelectorAll('.ui-cascader-column-title')[1].textContent).toEqual('A');
        expect(options()[0].getAttribute('aria-selected')).toEqual('false');

        const secondColumn = () => Array.from(root.querySelectorAll('.ui-cascader-column')[1].querySelectorAll('.ui-cascader-option') as NodeListOf<HTMLElement>);
        secondColumn()[0].click();
        await Promise.resolve();
        expect(host.picked).toEqual(['a', 'a1']);
        expect(root.textContent).toContain('A / A1');
        expect(root.getAttribute('aria-expanded')).toEqual('false');
        expect(root.querySelector('.ui-cascader-panel')).toBeFalsy();
    }

    @Test('roves columns with the keyboard and commits leaves')
    async keyboardColumns() {
        const { host, cascader } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const root = () => cascader.hostView.rootNodes[0] as HTMLElement;
        const key = async (name: string) => {
            root().dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: name, bubbles: true }));
            for (let index = 0; index < 4; index++) await Promise.resolve();
        };
        const column = (index: number) => Array.from(root().querySelectorAll('.ui-cascader-column')[index]
            .querySelectorAll('.ui-cascader-option') as NodeListOf<HTMLElement>);

        await key('ArrowDown');
        expect(root().getAttribute('aria-expanded')).toEqual('true');
        expect(column(0)[0].classList.contains('is-active')).toEqual(true);
        expect(column(0)[0].getAttribute('tabindex')).toEqual('0');
        expect(column(0)[1].getAttribute('tabindex')).toEqual('-1');

        await key('ArrowDown');
        expect(column(0)[1].classList.contains('is-active')).toEqual(true);
        await key('Enter');
        expect(host.picked).toEqual(['b']);
        expect(root().getAttribute('aria-expanded')).toEqual('false');

        await key('ArrowDown');
        await key('ArrowUp');
        expect(column(0)[0].classList.contains('is-active')).toEqual(true);
        await key('ArrowRight');
        expect(root().querySelectorAll('.ui-cascader-column').length).toEqual(2);
        await key('ArrowRight');
        expect(column(1)[0].classList.contains('is-active')).toEqual(true);
        expect(column(1)[1].getAttribute('tabindex')).toEqual('-1');
        await key('Enter');
        expect(host.picked).toEqual(['a', 'a1']);
        expect(root().getAttribute('aria-expanded')).toEqual('false');
    }

    @Test('keeps disabled branches inert and Escape closes')
    async disabledAndEscape() {
        const { root } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        (root.querySelector('.ui-cascader-trigger') as HTMLElement).click();
        await Promise.resolve();
        (root.querySelectorAll('.ui-cascader-option')[0] as HTMLElement).click();
        await Promise.resolve();
        const secondColumn = Array.from(root.querySelectorAll('.ui-cascader-column')[1].querySelectorAll('.ui-cascader-option') as NodeListOf<HTMLElement>);
        const disabled = secondColumn[1];
        expect(disabled.getAttribute('aria-disabled')).toEqual('true');
        disabled.click();
        await Promise.resolve();
        expect(secondColumn[0].getAttribute('aria-selected')).toEqual('false');

        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(root.getAttribute('aria-expanded')).toEqual('false');
    }
}
