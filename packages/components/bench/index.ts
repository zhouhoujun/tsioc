import { Application } from '@tsdi/core';
import { Component, ComponentsModule, QueryList, ViewChild, ViewChildren, reactive } from '../src';
import { DefaultReactiveEffect } from '../src/impl/effect';
import { XmlTemplateModule } from '../xml/src';

/**
 * Components performance harness.
 *
 * Run with: npm run bench
 *
 * The numbers are host-specific; use them to compare before/after a change
 * rather than as absolute budgets.
 */

function ms(start: bigint): number {
    return Number(process.hrtime.bigint() - start) / 1e6;
}

function report(name: string, duration: number, detail?: string): void {
    console.log(`${name.padEnd(34)} ${duration.toFixed(2).padStart(9)} ms${detail ? `  ${detail}` : ''}`);
}

async function benchReads(): Promise<void> {
    const effect = new DefaultReactiveEffect();
    const raw = { a: 1, nested: { c: 2 } };
    const proxy = reactive(raw, effect) as any;
    const rounds = 2_000_000;
    let sink = 0;
    let start = process.hrtime.bigint();
    for (let i = 0; i < rounds; i++) {
        sink += raw.a + raw.nested.c;
    }
    report('raw reads', ms(start), `${rounds} x 2`);
    start = process.hrtime.bigint();
    for (let i = 0; i < rounds; i++) {
        sink += proxy.a + proxy.nested.c;
    }
    report('proxy reads', ms(start), `${rounds} x 2`);
    if (!sink) {
        console.log('');
    }
}

async function benchBindings(): Promise<void> {
    const effect = new DefaultReactiveEffect();
    const state: any = reactive({ value: 0 }, effect);
    const bindings = 100;
    for (let i = 0; i < bindings; i++) {
        effect.run(() => { void state.value; });
    }
    const writes = 10_000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < writes; i++) {
        state.value = i;
    }
    report('trigger 1 key (100 bindings)', ms(start), `${writes} writes`);
}

async function benchComputed(): Promise<void> {
    let calls = 0;
    class State {
        user = { name: 'a' };
    }
    const effect = new DefaultReactiveEffect();
    const state: any = reactive(new State(), effect, [{
        propertyKey: 'label',
        cache: true,
        compute: (instance: any) => {
            calls += 1;
            return instance.user.name;
        }
    } as any]);
    effect.run(() => { void state.label; });
    const reads = 100_000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < reads; i++) {
        void state.label;
    }
    report('computed cache reads', ms(start), `${calls} compute call(s)`);
}

@Component({
    selector: 'bench-list',
    template: `<div><ul><li v-for="item in items">{{item.n}}</li></ul></div>`
})
class BenchList {
    items: Array<{ n: number }> = [];
}

async function benchList(): Promise<void> {
    const size = 1000;
    const ctx = await Application.run(BenchList, { deps: [XmlTemplateModule, ComponentsModule] });
    try {
        const ref = ctx.runners.getRef(BenchList) as any;
        const component = ref.instance as BenchList;
        component.items = Array.from({ length: size }, (_, n) => ({ n }));
        await Promise.resolve();

        let start = process.hrtime.bigint();
        for (let i = 0; i < 50; i++) {
            component.items = [...component.items, { n: size + i }];
            await Promise.resolve();
        }
        report('v-for append', ms(start), `50 rows @ ${size}`);

        start = process.hrtime.bigint();
        for (let i = 0; i < 20; i++) {
            component.items = [
                ...component.items.slice(0, 500),
                { n: -i },
                ...component.items.slice(500)
            ];
            await Promise.resolve();
        }
        report('v-for middle insert', ms(start), '20 rows @ 1000');

        start = process.hrtime.bigint();
        for (let i = 0; i < 20; i++) {
            component.items = [...component.items.slice(0, 500), ...component.items.slice(501)];
            await Promise.resolve();
        }
        report('v-for middle remove', ms(start), '20 rows @ 1000');

        start = process.hrtime.bigint();
        for (let i = 0; i < 20; i++) {
            component.items = [
                ...component.items.slice(1),
                component.items[0]
            ];
            await Promise.resolve();
        }
        report('v-for reorder', ms(start), '20 rotations @ 1000');
    } finally {
        await ctx.close();
    }
}

@Component({
    selector: 'bench-query-list',
    template: `<div><ul><li v-for="item in items" #row>{{item.n}}</li></ul></div>`
})
class BenchQueryList {
    @ViewChild('row') first?: any;
    @ViewChildren('row') rows?: QueryList<any>;
    items: Array<{ n: number }> = [];
}

async function benchViewQueries(): Promise<void> {
    const size = 1000;
    const ctx = await Application.run(BenchQueryList, { deps: [XmlTemplateModule, ComponentsModule] });
    try {
        const ref = ctx.runners.getRef(BenchQueryList) as any;
        const component = ref.instance as BenchQueryList;
        component.items = Array.from({ length: size }, (_, n) => ({ n }));
        await Promise.resolve();

        const index = ref.hostView.queryIndex;
        const lookups = 200_000;
        let found = 0;
        const startLookup = process.hrtime.bigint();
        for (let i = 0; i < lookups; i++) {
            if (index?.queryFirstByName('row')) {
                found += 1;
            }
        }
        report('viewchild lookups', ms(startLookup), `${lookups} hits (${found})`);

        const startAppend = process.hrtime.bigint();
        for (let i = 0; i < 50; i++) {
            component.items = [...component.items, { n: size + i }];
            await Promise.resolve();
        }
        report('viewchildren append', ms(startAppend), `50 rows @ ${size}`);
    } finally {
        await ctx.close();
    }
}

@Component({
    selector: 'bench-toggle',
    template: `<div><h1>{{title}}</h1><template v-if="show"><p>{{title}}</p><p>{{title}}</p><p>{{title}}</p><p>{{title}}</p><p>{{title}}</p></template></div>`
})
class BenchToggle {
    title = 'a';
    show = false;
}

async function benchToggleWrites(): Promise<void> {
    const ctx = await Application.run(BenchToggle, { deps: [XmlTemplateModule, ComponentsModule] });
    try {
        const ref = ctx.runners.getRef(BenchToggle) as any;
        const component = ref.instance as BenchToggle;
        for (let i = 0; i < 500; i++) {
            component.show = i % 2 === 0;
            await Promise.resolve();
        }
        component.show = false;
        await Promise.resolve();

        const start = process.hrtime.bigint();
        for (let i = 0; i < 2000; i++) {
            component.title = `t-${i}`;
            await Promise.resolve();
        }
        report('writes after 500 toggles', ms(start), '2000 writes');
    } finally {
        await ctx.close();
    }
}

async function main(): Promise<void> {
    console.log(`components bench (effect ${process.version})`);
    await benchReads();
    await benchBindings();
    await benchComputed();
    await benchList();
    await benchViewQueries();
    await benchToggleWrites();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
