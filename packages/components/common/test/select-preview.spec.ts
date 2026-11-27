import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SelectComponent, SelectModule } from '../select';

async function settle(): Promise<void> {
    for (let index = 0; index < 20; index++) await Promise.resolve();
}

@Suite('common select preview')
export class SelectPreviewTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SelectModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
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

    private async mount(): Promise<{ ref: ComponentRef<SelectComponent>; select: SelectComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(SelectComponent, { injector: this.ctx }) as ComponentRef<SelectComponent>;
        await ref.render();
        await settle();
        const select = ref.instance;
        select.options = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' }
        ];
        return { ref, select };
    }

    @Test('previews the highlighted row and reverts the previous preview before the next')
    async previewAndSwitch() {
        const { ref, select } = await this.mount();
        const previews: string[] = [];
        const undos: string[] = [];
        select.highlightAction = value => {
            previews.push(value);
            return () => undos.push(value);
        };
        select.selectedIndex = 1;
        await settle();
        expect(previews).toEqual(['b']);

        select.selectedIndex = 2;
        await settle();
        expect(undos).toEqual(['b']);
        expect(previews).toEqual(['b', 'c']);

        select.choose(2);
        await settle();
        expect(select.selectedIndex).toEqual(2);
        select.close();
        expect(undos).toEqual(['b']);
        ref.destroy();
    }

    @Test('closing or destroying an uncommitted preview reverts it')
    async closeReverts() {
        const { ref, select } = await this.mount();
        const undos: string[] = [];
        select.highlightAction = value => () => undos.push(value);
        select.selectedIndex = 1;
        await settle();
        select.close();
        expect(undos).toEqual(['b']);

        select.open = true;
        select.selectedIndex = 2;
        await settle();
        select.onDestroy();
        expect(undos).toEqual(['b', 'c']);
        ref.destroy();
    }

    @Test('no highlight hook leaves selection behavior unchanged')
    async plainSelection() {
        const { ref, select } = await this.mount();
        let selected = '';
        select.selectAction = value => { selected = value; };
        select.selectedIndex = 2;
        select.choose(2);
        expect(select.selectedIndex).toEqual(2);
        expect(selected).toEqual('c');
        ref.destroy();
    }
}
