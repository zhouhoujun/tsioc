import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import {
    applyPrecompiledComponent,
    Component,
    ComponentRef,
    ComponentsModule
} from '../src';
import { XmlTemplateModule } from '../xml/src';

/**
 * AOT output replaces `@Component(...)` on a bootstrap class with
 * `applyPrecompiledComponent(...)`. That path must register the same
 * invocation factory as the runtime decorator, otherwise
 * `Application.run(MyComponent)` falls back to the default invocation and
 * fails with "<Component> is invaild runnable, can not invocation without
 * method param." (this broke the workflow-admin browser preview).
 */
@Suite('precompiled component bootstrap')
export class PrecompiledComponentBootstrapTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(PrecompiledBootComponent, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
    }

    @After()
    async destroy() {
        await this.ctx?.close();
    }

    @Test('boots a component applied through applyPrecompiledComponent')
    async bootsPrecompiledComponent() {
        expect(this.ctx.runners.size).toEqual(1);
        const ref = this.ctx.runners.getRef(PrecompiledBootComponent) as ComponentRef<PrecompiledBootComponent>;
        expect(ref.instance instanceof PrecompiledBootComponent).toBe(true);
        const root = ref.hostView.rootNodes[0] as any;
        expect(root.querySelector('.precompiled-boot')?.textContent).toContain('compiled');
    }
}

class PrecompiledBootComponent {
    title = 'compiled';
}

applyPrecompiledComponent(
    PrecompiledBootComponent,
    {
        selector: 'precompiled-boot-component',
        template: '<div class="precompiled-boot">{{title}}</div>'
    },
    [[Component, {
        selector: 'precompiled-boot-component',
        template: '<div class="precompiled-boot">{{title}}</div>'
    }]]
);
