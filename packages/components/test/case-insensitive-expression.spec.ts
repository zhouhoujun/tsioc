import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule } from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'case-expr-comp',
    template: `<div><span class="top">{{DISPLAYNAME}}</span><span class="nested">{{user.NAME}}</span></div>`
})
class CaseExpressionComponent {
    displayName = 'Hello';
    user = { name: 'nested' };
}

@Suite('expression case-insensitive lookup')
export class CaseInsensitiveExpressionTest {
    @Test('resolves top-level and nested properties with different casing')
    async resolvesCaseInsensitive() {
        const ctx = await Application.run(CaseExpressionComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(CaseExpressionComponent) as any;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.top').textContent).toBe('Hello');
            expect(root.querySelector('.nested').textContent).toBe('nested');
        } finally {
            await ctx.close();
        }
    }
}
