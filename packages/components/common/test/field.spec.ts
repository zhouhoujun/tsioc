import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { FieldComponent, FieldModule } from '../field';

@Component({
    selector: 'field-host',
    imports: [FieldComponent],
    template: `
    <ui-field-group label="Name" hint="Shown to teammates" controlId="name-input"
        hintId="name-hint" errorId="name-error" labelTooltip="Visible to collaborators" :required="true">
        <input id="name-input" class="control" />
    </ui-field-group>
    <ui-field-group label="Token" error="Required" controlId="token-input"
        hintId="token-hint" errorId="token-error" :invalid="true">
        <input id="token-input" class="control" />
    </ui-field-group>`
})
class FieldHostComponent {}

@Suite('common field group')
export class FieldTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(FieldHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, FieldModule],
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

    @Test('renders label/hint and links them through aria-describedby')
    async semantics() {
        const ref = this.ctx.get(ComponentFactory).create(FieldHostComponent, { injector: this.ctx }) as ComponentRef<FieldHostComponent>;
        await ref.render();
        await Promise.resolve();
        const fields = ref.hostView.queryAll(FieldComponent) as ComponentRef<FieldComponent>[];
        const first = (fields[0].elementRef.nativeElement as HTMLElement).querySelector('.ui-field-group') as HTMLElement;
        expect(first.querySelector('.ui-field-group-label')?.textContent).toContain('Name');
        expect(first.querySelector('.ui-field-group-required')?.textContent).toContain('*');
        expect(first.querySelector('.ui-field-group-label')?.getAttribute('id')).toEqual('name-input-label');
        expect(first.querySelector('.ui-field-group-info')?.getAttribute('title')).toContain('Visible to collaborators');
        expect(first.querySelector('.ui-field-group-info')?.getAttribute('id')).toEqual('name-input-tooltip');
        expect(first.querySelector('.ui-field-group-hint')?.textContent).toContain('Shown to teammates');
        expect(first.getAttribute('aria-describedby')).toEqual('name-hint');
        expect(first.getAttribute('data-invalid')).toEqual('false');

        const second = (fields[1].elementRef.nativeElement as HTMLElement).querySelector('.ui-field-group') as HTMLElement;
        expect(second.querySelector('.ui-field-group-error')?.textContent).toContain('Required');
        expect(second.getAttribute('aria-describedby')).toEqual('token-error');
        expect(second.getAttribute('data-invalid')).toEqual('true');
    }
}
