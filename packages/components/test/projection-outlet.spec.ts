import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule } from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'duplicate-outlet-host',
    template: `<div><v-content></v-content><v-content></v-content></div>`
})
class DuplicateOutletHost { }

@Suite('projection outlets')
export class ProjectionOutletTest {
    @Test('warns when two outlets use the same selector')
    async duplicateDefaultOutlet() {
        const originalWarn = console.warn;
        const warnings: any[][] = [];
        console.warn = (...args: any[]) => { warnings.push(args); };
        let ctx: any;
        try {
            ctx = await Application.run(DuplicateOutletHost, {
                deps: [ConsoleTemplateModule, ComponentsModule]
            });
        } finally {
            console.warn = originalWarn;
        }
        try {
            expect(warnings.some(args => String(args[0]).includes('duplicate <v-content> outlet'))).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }
}
