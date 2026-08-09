import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '../src';
import { ConsoleRenderer, ConsoleTemplateModule } from '../console/src';

@Suite('Minimal v-if/v-else + @click repro')
export class MinimalIfElseClickReproTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MinimalComp, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('v-if+v-else with @click on v-if does not duplicate')
    async noDuplicate() {
        const ref = this.ctx.runners.getRef(MinimalComp) as ComponentRef<MinimalComp>;
        await Promise.resolve();
        await Promise.resolve();
        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0];

        const countToggle = () => renderer.renderToLines(root).filter(l => String(l).includes('Click')).length;

        // verify directive instances via registry
        const registry: any[] = [];
        (globalThis as any).__ifRegistry = registry;
        await Promise.resolve();

        console.log('initial count:', countToggle());
        expect(countToggle()).toBe(1);

        // expand
        ref.instance.setDetail(true);
        await Promise.resolve();
        await Promise.resolve();
        console.log('expanded count:', countToggle());
        expect(countToggle()).toBe(1);

        // collapse
        ref.instance.setDetail(false);
        await Promise.resolve();
        await Promise.resolve();
        console.log('collapsed count:', countToggle());
        expect(countToggle()).toBe(1);
    }
}

@Component({
    selector: 'minimal-comp',
    template: `
    <div class="console-panel">
        <div class="message-row" v-for="line in lines">
            <label class="message-line" v-style="lineStyle">
                <span v-style="contentStyle">{{line.role}}</span>
                <span class="message-detail-toggle" v-style="lineStyle" v-if="line.toggleContent" @click="onToggle(line)">{{line.toggleContent}}</span>
                <span v-style="lineStyle" v-else>{{line.content}}</span>
            </label>
        </div>
    </div>
    `
})
export class MinimalComp {
    detailOpen = false;
    lines = [
        { id: 'l1', role: 'x', content: 'content line' },
        { id: 'l2', role: 'y', content: 'toggle text', toggleContent: '… 2 more lines. Click to expand' }
    ];

    setDetail(open: boolean): void {
        this.detailOpen = open;
        this.lines = [
            { id: 'l1', role: 'x', content: 'content line' },
            { id: 'l2', role: 'y', content: this.detailOpen ? 'full content' : 'toggle text', toggleContent: this.detailOpen ? 'Click to collapse' : '… 2 more lines. Click to expand' }
        ];
    }

    onToggle(line: any): void {
        this.setDetail(!this.detailOpen);
    }

    get lineStyle(): Record<string, string> {
        return { color: '#c9d1d9' };
    }

    get contentStyle(): Record<string, string> {
        return { color: '#c9d1d9' };
    }
}
