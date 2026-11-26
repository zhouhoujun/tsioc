import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TextFieldComponent, TextFieldModule } from '../text-field';
import { CheckboxComponent, CheckboxModule } from '../checkbox';
import { SwitchComponent, SwitchModule } from '../switch';
import { RadioGroupComponent, RadioGroupModule } from '../radio-group';

@Component({
    selector: 'p3-ui-host',
    imports: [TextFieldComponent, CheckboxComponent, SwitchComponent, RadioGroupComponent],
    template: `
    <ui-text-field label="Name" placeholder="Name" :value="name" clearable
        :changeAction="onName" :submitAction="onSubmit"></ui-text-field>
    <ui-text-field :multiline="true" :rows="2" :value="note" :changeAction="onNote"></ui-text-field>
    <ui-text-field label="Email" inputId="email-field" name="email" hint="Work address"
        error="Required field" required></ui-text-field>
    <ui-text-field label="Amount" prefix="$" suffix=".00" addonBefore="USD" addonAfter="net"
        maxLength="8" revealable type="password" inputMode="decimal" autocomplete="off"
        clearable :value="secret" :changeAction="onSecret"></ui-text-field>
    <ui-checkbox label="Enabled" :checked="enabled" :changeAction="onEnabled"></ui-checkbox>
    <ui-switch label="Live" :checked="live" :changeAction="onLive"></ui-switch>
    <ui-radio-group :options="modes" :value="mode" :changeAction="onMode"></ui-radio-group>`
})
class P3UiHostComponent {
    name = '';
    note = 'line';
    secret = 'secret';
    onSecret = (value: string) => { this.secret = value; };
    enabled = false;
    live = false;
    mode = 'basic';
    submitted = '';
    modes = [
        { label: 'Basic', value: 'basic' },
        { label: 'Advanced', value: 'advanced', description: 'more options' },
        { label: 'Locked', value: 'locked', disabled: true }
    ];
    onName = (value: string) => { this.name = value; };
    onNote = (value: string) => { this.note = value; };
    onSubmit = (value: string) => { this.submitted = value; };
    onEnabled = (value: boolean) => { this.enabled = value; };
    onLive = (value: boolean) => { this.live = value; };
    onMode = (value: string) => { this.mode = value; };
}

@Suite('common P3 form widgets')
export class P3FormWidgetsTest {
    ctx!: ApplicationContext;
    win!: any;

    @Before()
    async init() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.win = dom.window;
        this.ctx = await Application.run(P3UiHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                TextFieldModule,
                CheckboxModule,
                SwitchModule,
                RadioGroupModule
            ],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<ComponentRef<P3UiHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(P3UiHostComponent, {
            injector: this.ctx
        }) as ComponentRef<P3UiHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('text field reports edits, enter submit and clear')
    async textField() {
        const ref = await this.mount();
        const host = ref.instance as P3UiHostComponent;
        const fields = ref.hostView.queryAll(TextFieldComponent) as ComponentRef<TextFieldComponent>[];
        const root = fields[0].hostView.rootNodes[0] as HTMLElement;
        const input = root.querySelector('input') as HTMLInputElement;

        input.value = 'Ada';
        input.dispatchEvent(new this.win.Event('input', { bubbles: true }));
        await Promise.resolve();
        expect(host.name).toEqual('Ada');

        input.dispatchEvent(new this.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.submitted).toEqual('Ada');

        (root.querySelector('.ui-field-clear') as HTMLButtonElement).click();
        expect(host.name).toEqual('');

        const multiline = fields[1].hostView.rootNodes[0] as HTMLElement;
        expect(multiline.querySelector('textarea')).toBeTruthy();

        const email = fields[2].hostView.rootNodes[0] as HTMLElement;
        const emailInput = email.querySelector('input') as HTMLInputElement;
        const hint = email.querySelector('.ui-field-hint') as HTMLElement;
        const error = email.querySelector('.ui-field-error') as HTMLElement;
        expect(emailInput.id).toEqual('email-field');
        expect(emailInput.getAttribute('name')).toEqual('email');
        expect(email.querySelector('.ui-field-label')?.getAttribute('for')).toEqual('email-field');
        expect(emailInput.getAttribute('aria-required')).toEqual('true');
        expect(emailInput.getAttribute('aria-invalid')).toEqual('true');
        expect(error.getAttribute('role')).toEqual('alert');
        expect(hint.id).toEqual('email-field-hint');
        expect(error.id).toEqual('email-field-error');
        expect(emailInput.getAttribute('aria-describedby')).toEqual('email-field-hint email-field-error');
        expect(email.className).toContain('has-error');

        const amount = fields[3].hostView.rootNodes[0] as HTMLElement;
        const amountInput = amount.querySelector('input') as HTMLInputElement;
        expect(amount.textContent).toContain('USD');
        expect(amount.textContent).toContain('$');
        expect(amount.textContent).toContain('.00');
        expect(amount.textContent).toContain('net');
        expect(amountInput.type).toEqual('password');
        expect(amountInput.getAttribute('maxlength')).toEqual('8');
        expect(amountInput.getAttribute('inputmode')).toEqual('decimal');
        expect(amountInput.getAttribute('autocomplete')).toEqual('off');
        const reveal = amount.querySelector('.ui-field-reveal') as HTMLButtonElement;
        expect(reveal.getAttribute('data-plain')).toEqual('true');
        reveal.click();
        expect(amountInput.type).toEqual('text');
        expect(reveal.getAttribute('aria-pressed')).toEqual('true');
        reveal.click();
        expect(amountInput.type).toEqual('password');

        const amountClear = amount.querySelector('.ui-field-clear') as HTMLButtonElement;
        expect(amountClear.getAttribute('data-plain')).toEqual('true');
        amountInput.dispatchEvent(new (this.win as any).KeyboardEvent('keydown', {
            key: 'Backspace',
            ctrlKey: true,
            bubbles: true
        }));
        await Promise.resolve();
        expect((ref.instance as P3UiHostComponent).secret).toEqual('');
    }

    @Test('checkbox and switch toggle their semantic state')
    async checkboxAndSwitch() {
        const ref = await this.mount();
        const host = ref.instance as P3UiHostComponent;
        const checkbox = ref.hostView.query(CheckboxComponent) as ComponentRef<CheckboxComponent>;
        const checkboxRoot = checkbox.hostView.rootNodes[0] as HTMLElement;
        expect(checkboxRoot.getAttribute('role')).toEqual('checkbox');
        expect(checkboxRoot.getAttribute('aria-checked')).toEqual('false');
        checkboxRoot.click();
        expect(host.enabled).toEqual(true);
        expect(checkboxRoot.getAttribute('aria-checked')).toEqual('true');
        expect(checkboxRoot.textContent).toContain('✓');

        const switchRef = ref.hostView.query(SwitchComponent) as ComponentRef<SwitchComponent>;
        const switchRoot = switchRef.hostView.rootNodes[0] as HTMLElement;
        expect(switchRoot.getAttribute('role')).toEqual('switch');
        expect(switchRoot.textContent).toContain('Off');
        switchRoot.click();
        expect(host.live).toEqual(true);
        expect(switchRoot.textContent).toContain('On');
    }

    @Test('radio group selects enabled options and exposes descriptions')
    async radioGroup() {
        const ref = await this.mount();
        const host = ref.instance as P3UiHostComponent;
        const group = ref.hostView.query(RadioGroupComponent) as ComponentRef<RadioGroupComponent>;
        const root = group.hostView.rootNodes[0] as HTMLElement;
        const options = root.querySelectorAll('.ui-radio-option') as NodeListOf<HTMLElement>;

        expect(root.getAttribute('role')).toEqual('radiogroup');
        expect(options[0].getAttribute('aria-checked')).toEqual('true');
        expect(options[0].getAttribute('tabindex')).toEqual('0');
        expect(options[1].getAttribute('tabindex')).toEqual('-1');
        expect(options[1].textContent).toContain('more options');

        options[1].click();
        await Promise.resolve();
        expect(host.mode).toEqual('advanced');
        expect(options[0].getAttribute('aria-checked')).toEqual('false');
        expect(options[0].getAttribute('tabindex')).toEqual('-1');
        expect(options[1].getAttribute('tabindex')).toEqual('0');

        options[2].click();
        expect(host.mode).toEqual('advanced');
        expect(options[2].getAttribute('aria-disabled')).toEqual('true');
    }
}
