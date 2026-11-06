import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { FormControl, FormControlDirective, FormsModule, Validators } from '../src';

@Component({
    selector: 'form-control-directive-host',
    imports: [FormControlDirective],
    template: '<section><input class="field" [formControl]="control"></section>'
})
class FormControlHost {
    control = new FormControl('', Validators.required);
}

@Suite('form control directive')
export class FormControlDirectiveTest {
    ctx!: ApplicationContext;

    @After()
    async clean() {
        await this.ctx?.close();
        if (global.gc) global.gc();
    }

    @Test('writes control state to the input and reads input events back')
    async bindsInput() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(FormControlHost, {
            deps: [HtmlTemplateModule, ComponentsModule, FormsModule],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(FormControlHost) as ComponentRef<FormControlHost>;
        await ref.render();
        const root = ref.hostView.rootNodes[0] as any;
        const input = root.querySelector('.field') as any;
        expect(input.getAttribute('aria-invalid')).toEqual('true');

        input.value = 'hello';
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        expect(ref.instance.control.value).toEqual('hello');
        expect(ref.instance.control.valid).toEqual(true);
        expect(input.getAttribute('aria-invalid')).toEqual('false');

        ref.instance.control.setValue('');
        expect(input.value).toEqual('');
        expect(input.getAttribute('aria-invalid')).toEqual('true');
        dom.window.close();
    }
}
