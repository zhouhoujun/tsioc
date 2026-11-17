import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule, Directive, ViewChild } from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'inject-child',
    template: `<span>{{label}}</span>`
})
class InjectChild {
    label = 'child';
}

@Directive({ selector: '[probe]' })
class ProbeDirective {
    constructor(public child: InjectChild) { }
}

@Component({
    selector: 'inject-parent',
    imports: [InjectChild, ProbeDirective],
    template: `<div><inject-child probe></inject-child></div>`
})
class InjectParent {
    @ViewChild(ProbeDirective) probe?: ProbeDirective;
    @ViewChild(InjectChild) child?: InjectChild;
}

@Suite('component object resolution')
export class ComponentResolutionTest {
    @Test('component type injection yields the instance, not ComponentRef')
    async componentInjection() {
        const ctx = await Application.run(InjectParent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(InjectParent) as any;
            const parent = ref.instance as InjectParent;
            expect(parent.probe).toBeDefined();
            expect(parent.child).toBeDefined();
            expect(parent.probe?.child).toBeInstanceOf(InjectChild);
            expect(parent.probe?.child).toBe(parent.child);
        } finally {
            await ctx.close();
        }
    }
}
