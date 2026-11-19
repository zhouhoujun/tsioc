import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import {
    applyPrecompiledComponent,
    applyPrecompiledDirective,
    Component,
    ComponentRef,
    ComponentsModule,
    Directive,
    ElementRef
} from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

/**
 * AOT plans used to match directives/custom elements only on elements that
 * carried attributes. Selector-only directives (`router-outlet`, element
 * selectors like `<my-button>`) were therefore never instantiated in the
 * bundled workflow admin: the shell rendered `<router-outlet>` but no route
 * component ever appeared.
 */
class PlanProbeDirective {
    constructor(private readonly elementRef: ElementRef) { }

    onInit(): void {
        this.elementRef.nativeElement.setAttribute('data-plan-probe', 'bound');
    }
}

applyPrecompiledDirective(
    PlanProbeDirective,
    {
        selector: 'plan-probe',
        methodMetadatas: [['constructor', {
            params: [{ provider: ElementRef, propertyKey: 'constructor' }]
        }]]
    },
    [[Directive, { selector: 'plan-probe' }]]
);

class PlanBindingHostComponent { }

applyPrecompiledComponent(
    PlanBindingHostComponent,
    {
        selector: 'plan-binding-host',
        imports: [PlanProbeDirective],
        template: '<div class="host"><plan-probe></plan-probe><span class="plain">plain</span></div>',
        templatePlan: {
            delimiter: '{{}}',
            nodes: [{
                kind: 'element',
                tag: 'div',
                attrs: [['class', 'host']],
                rawAttrs: [['class', 'host']],
                children: [
                    { kind: 'element', tag: 'plan-probe', attrs: [], rawAttrs: [], children: [] },
                    {
                        kind: 'element',
                        tag: 'span',
                        attrs: [['class', 'plain']],
                        rawAttrs: [['class', 'plain']],
                        children: [{ kind: 'text', value: 'plain' }]
                    }
                ]
            }]
        }
    },
    [[Component, {
        selector: 'plan-binding-host',
        imports: [PlanProbeDirective],
        template: '<div class="host"><plan-probe></plan-probe><span class="plain">plain</span></div>'
    }]]
);

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('HTML plan binding')
export class HtmlPlanBindingTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(PlanBindingHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
        await flush();
    }

    @After()
    async destroy() {
        await this.ctx?.close();
    }

    @Test('binds directives whose selector only matches the element tag')
    async bindsTagOnlyDirective() {
        const ref = this.ctx.runners.getRef(PlanBindingHostComponent) as ComponentRef<PlanBindingHostComponent>;
        const root = ref.hostView.rootNodes[0] as any;

        expect(root.classList.contains('host')).toBe(true);
        expect(root.querySelectorAll('.plain').length).toBe(1);
        const probe = root.querySelector('plan-probe') as any;
        expect(!!probe).toBe(true);
        expect(probe.getAttribute('data-plan-probe')).toEqual('bound');
    }
}
