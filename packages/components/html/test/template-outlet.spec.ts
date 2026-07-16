import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'template-outlet-probe',
    imports: [],
    template: `
        <div class="outlet-root">
            <div v-templateOutlet="rowTemplate" :templateOutletContext="item"></div>
            <v-template #rowTemplate>
                <label class="outlet-line" v-for="line in lines">{{line}}</label>
            </v-template>
        </div>
    `
})
class TemplateOutletProbeComponent {
    item = {
        lines: ['alpha', 'beta']
    };
}

@Component({
    selector: 'template-outlet-item-probe',
    imports: [],
    template: `
        <div class="outlet-root">
            <div v-templateOutlet="rowTemplate" :templateOutletContext="{ item: item }"></div>
            <v-template #rowTemplate>
                <label class="outlet-item">{{item.lines[0]}}</label>
            </v-template>
        </div>
    `
})
class TemplateOutletItemProbeComponent {
    item = {
        lines: ['gamma']
    };
}

@Suite('HTML TemplateOutlet')
export class HtmlTemplateOutletTest {
    ctx!: ApplicationContext;
    consoleError!: typeof console.error;
    errors: any[] = [];

    @Before()
    async init() {
        this.consoleError = console.error;
        this.errors = [];
        console.error = (...args: any[]) => {
            this.errors.push(args);
        };

        this.ctx = await Application.run(TemplateOutletProbeComponent, {
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

    @Test('renders template outlet with bound context without early evaluation errors')
    async renderTemplateOutletWithContext() {
        const ref = this.ctx.runners.getRef(TemplateOutletProbeComponent) as ComponentRef<TemplateOutletProbeComponent>;
        await ref.render();
        await Promise.resolve();

        const root = ref.hostView.rootNodes[0] as any;
        const labels = Array.from(root.querySelectorAll('.outlet-line')).map((node: any) => node.textContent?.trim());

        expect(labels).toEqual(['alpha', 'beta']);
        expect(this.errors.length).toEqual(0);
    }

    @Test('renders template outlet context item in nested template')
    async renderTemplateOutletWithItemContext() {
        const ctx = await Application.run(TemplateOutletItemProbeComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
        const ref = ctx.runners.getRef(TemplateOutletItemProbeComponent) as ComponentRef<TemplateOutletItemProbeComponent>;
        await ref.render();
        await Promise.resolve();

        const root = ref.hostView.rootNodes[0] as any;
        const labels = Array.from(root.querySelectorAll('.outlet-item')).map((node: any) => node.textContent?.trim());

        expect(labels).toEqual(['gamma']);
        await ctx.close();
    }

    @After()
    async clean() {
        console.error = this.consoleError;
        await this.ctx?.close();
    }
}
