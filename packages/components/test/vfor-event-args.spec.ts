import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentFactory, ComponentsModule } from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'vfor-event-comp',
    template: `<div><span class="pick" v-for="item in items" @click="pick(item.id)">{{item.label}}</span></div>`
})
class VForEventComponent {
    items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    picked: string[] = [];

    pick(id: string): void {
        this.picked.push(id);
    }

    replaceItems(): void {
        this.items = [{ id: 'c', label: 'C' }, { id: 'd', label: 'D' }];
    }
}

@Suite('v-for event arguments')
export class VForEventArgumentsTest {
    @Test('reused v-for views evaluate handler arguments against the current item')
    async currentItemArguments() {
        const ctx = await Application.run({
            module: {
                imports: [ConsoleTemplateModule, ComponentsModule],
                bootstrap: [VForEventComponent]
            }
        });
        try {
            const ref = ctx.get(ComponentFactory).create(VForEventComponent, { injector: ctx });
            await ref.render();
            let nodes = (ref.hostView.rootNodes[0] as any).querySelectorAll('.pick');
            nodes[0].dispatchEvent({ type: 'click', target: nodes[0] } as any);

            ref.instance.replaceItems();
            for (let index = 0; index < 16; index++) await Promise.resolve();
            nodes = (ref.hostView.rootNodes[0] as any).querySelectorAll('.pick');
            nodes[0].dispatchEvent({ type: 'click', target: nodes[0] } as any);

            expect(ref.instance.picked).toEqual(['a', 'c']);
        } finally {
            await ctx.close();
        }
    }
}
