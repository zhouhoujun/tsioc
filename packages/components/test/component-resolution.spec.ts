import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
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

@Injectable()
class ChildService {
    value = 'service';
}

@Component({
    selector: 'service-child',
    providers: [ChildService],
    template: `<span>service</span>`
})
class ServiceChild { }

@Component({
    selector: 'inject-parent',
    imports: [InjectChild, ProbeDirective, ServiceChild],
    template: `<div><inject-child probe></inject-child><service-child #serviceChild></service-child></div>`
})
class InjectParent {
    @ViewChild(ProbeDirective) probe?: ProbeDirective;
    @ViewChild(InjectChild) child?: InjectChild;
    @ViewChild('serviceChild', ChildService) service?: ChildService;
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
            expect(parent.service).toBeInstanceOf(ChildService);
            expect(parent.service?.value).toBe('service');
        } finally {
            await ctx.close();
        }
    }
}
