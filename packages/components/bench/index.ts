import { Application } from '@tsdi/core';
import { Attribute, Component, ComponentFactory, ComponentRef, ComponentsModule, QueryList, ViewChild, ViewChildren, reactive } from '../src';
import { DefaultReactiveEffect } from '../src/impl/effect';
import { XmlTemplateModule } from '../xml/src';
import { HtmlTemplateModule } from '../html/src';
import { DOCUMENT } from '@tsdi/common';
import { getDisplayWidth, sliceByDisplayWidth } from '../common/src/display-width';
import { AutoCompleteComponent } from '../common/autocomplete/src/autocomplete';
import { DynamicFormComponent } from '../common/dynamic-form/src/dynamic-form';
import { filterDataTableRows, sortDataTableRows } from '../common/data-table/src/data-table.view';

/**
 * Components performance harness.
 *
 * Run with: npm run bench
 *
 * The numbers are host-specific; use them to compare before/after a change
 * rather than as absolute budgets.
 */

/**
 * Measure CPU time instead of wall time: the budget gate runs beside other
 * processes, and wall-clock samples mostly capture scheduler interference.
 * CPU time still grows when the code does more work.
 */
function cpuMs(): number {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000;
}

function ms(start: number): number {
    return cpuMs() - start;
}

function now(): number {
    return cpuMs();
}

/**
 * Micro-benchmarks on a loaded machine are dominated by interference (GC, other
 * processes), which made the budget gate flaky. Each metric is measured several
 * times and the best run is reported: the minimum is the least-interrupted
 * sample and still moves when the code gets slower.
 */
const results = new Map<string, { duration: number; detail?: string }>();

function report(name: string, duration: number, detail?: string): void {
    const current = results.get(name);
    if (!current || duration < current.duration) {
        results.set(name, { duration, detail: detail ?? current?.detail });
    }
}

function printResults(): void {
    for (const [name, entry] of results) {
        console.log(`${name.padEnd(34)} ${entry.duration.toFixed(2).padStart(9)} ms${entry.detail ? `  ${entry.detail}` : ''}`);
    }
}

/**
 * Calibration workload: a plain CPU loop whose cost tracks the host's current
 * effective speed (including contention with other processes). The budget gate
 * scales its limits by this value so a busy machine does not fail the check,
 * while a real code regression still shows up against the calibration.
 */
async function benchCalibration(): Promise<void> {
    // Memory-access loop of the same shape as the proxy benchmarks: under
    // contention the frequency/cache budget drops, which hits property-read
    // loops harder than pure arithmetic.
    const items = Array.from({ length: 256 }, (_value, index) => ({ value: index, nested: { value: index * 2 } }));
    const rounds = 200_000;
    let acc = 0;
    const start = now();
    for (let round = 0; round < rounds; round++) {
        for (let index = 0; index < items.length; index++) {
            acc += items[index].value + items[index].nested.value;
        }
    }
    report('calibration', ms(start), `${rounds * items.length} reads`);
    if (acc === -1) {
        console.log('');
    }
}

async function benchReads(): Promise<void> {
    const effect = new DefaultReactiveEffect();
    const raw = { a: 1, nested: { c: 2 } };
    const proxy = reactive(raw, effect) as any;
    const rounds = 2_000_000;
    let sink = 0;
    let start = now();
    for (let i = 0; i < rounds; i++) {
        sink += raw.a + raw.nested.c;
    }
    report('raw reads', ms(start), `${rounds} x 2`);
    start = now();
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
    const start = now();
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
    const start = now();
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

        let start = now();
        for (let i = 0; i < 50; i++) {
            component.items = [...component.items, { n: size + i }];
            await Promise.resolve();
        }
        report('v-for append', ms(start), `50 rows @ ${size}`);

        start = now();
        for (let i = 0; i < 20; i++) {
            component.items = [
                ...component.items.slice(0, 500),
                { n: -i },
                ...component.items.slice(500)
            ];
            await Promise.resolve();
        }
        report('v-for middle insert', ms(start), '20 rows @ 1000');

        start = now();
        for (let i = 0; i < 20; i++) {
            component.items = [...component.items.slice(0, 500), ...component.items.slice(501)];
            await Promise.resolve();
        }
        report('v-for middle remove', ms(start), '20 rows @ 1000');

        start = now();
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
        const startLookup = now();
        for (let i = 0; i < lookups; i++) {
            if (index?.queryFirstByName('row')) {
                found += 1;
            }
        }
        report('viewchild lookups', ms(startLookup), `${lookups} hits (${found})`);

        const startAppend = now();
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

        const start = now();
        for (let i = 0; i < 2000; i++) {
            component.title = `t-${i}`;
            await Promise.resolve();
        }
        report('writes after 500 toggles', ms(start), '2000 writes');
    } finally {
        await ctx.close();
    }
}

async function benchCommonWidth(): Promise<void> {
    const styled = '\x1b[31mred\x1b[0m '.repeat(4000);
    const plain = 'hello 世界 '.repeat(2000);
    let sink = 0;
    let start = now();
    for (let i = 0; i < 40; i++) {
        sink += getDisplayWidth(styled);
    }
    report('common display width (ansi)', ms(start), '40 x 52k');

    start = now();
    for (let i = 0; i < 40; i++) {
        sink += sliceByDisplayWidth(styled, 120).length;
        sink += getDisplayWidth(plain);
    }
    report('common slice width (ansi/cjk)', ms(start), '40 x 52k');
    if (sink === -1) {
        console.log('');
    }
}

@Component({
    selector: 'bench-bindings-host',
    imports: [],
    template: `<div class="root"><span class="cell" v-for="cell in cells" :data-id="cell.id" title="{{cell.label}}">{{cell.label}}</span></div>`
})
class BenchBindingsHost {
    cells = Array.from({ length: 200 }, (_, index) => ({ id: `c${index}`, label: `Cell ${index}` }));
}

/** First-render cost of per-element bindings (interpolation + attribute). */
async function benchRenderBindings(): Promise<void> {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const ctx = await Application.run(BenchBindingsHost, {
        deps: [HtmlTemplateModule, ComponentsModule],
        providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
    });
    try {
        const factory = ctx.get(ComponentFactory);
        (ctx.runners.getRef(BenchBindingsHost) as any)?.destroy?.();
        const renders = 5;
        const start = now();
        for (let i = 0; i < renders; i++) {
            const ref = factory.create(BenchBindingsHost, { injector: ctx }) as ComponentRef<BenchBindingsHost>;
            await ref.render();
            await ref.destroy();
        }
        report('render 200 bound rows', ms(start), `${renders} renders`);
    } finally {
        await ctx.close();
        dom.window.close();
    }
}

@Component({
    selector: 'bench-render-child',
    template: `<span class="child"><i class="glyph">{{glyph}}</i><b class="label">{{label}}</b></span>`
})
class BenchRenderChild {
    @Attribute() glyph = '';
    @Attribute() label = '';
}

/**
 * Designer-shaped tree: header/tabs, a 60-entry palette of child components, a
 * canvas with nodes and a status footer. Mirrors the workflow designer's
 * element/component mix so first-render regressions show up here.
 */
@Component({
    selector: 'bench-render-host',
    imports: [BenchRenderChild],
    template: `
    <div class="root">
        <header class="bar">
            <span class="title">{{title}}</span>
            <nav class="tabs"><span class="tab" v-for="tab in tabs">{{tab}}</span></nav>
        </header>
        <section class="body">
            <aside class="palette">
                <bench-render-child v-for="item in items" :glyph="item.glyph" :label="item.label"></bench-render-child>
            </aside>
            <main class="canvas">
                <div class="grid"></div>
                <div class="node" v-for="node in nodes" data-id="{{node.id}}">
                    <span class="node-name">{{node.name}}</span>
                    <span class="node-type">{{node.type}}</span>
                </div>
            </main>
        </section>
        <footer class="status"><span>{{status}}</span><span>{{zoom}}%</span></footer>
    </div>`
})
class BenchRenderHost {
    title = 'Workflow';
    tabs = ['One', 'Two', 'Three'];
    items = Array.from({ length: 60 }, (_, index) => ({ glyph: `g${index}`, label: `Node ${index}` }));
    nodes = Array.from({ length: 12 }, (_, index) => ({ id: `n${index}`, name: `Node ${index}`, type: 'task' }));
    status = 'Ready';
    zoom = 100;
}

async function benchRender(): Promise<void> {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const ctx = await Application.run(BenchRenderHost, {
        deps: [HtmlTemplateModule, ComponentsModule],
        providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
    });
    try {
        const factory = ctx.get(ComponentFactory);
        (ctx.runners.getRef(BenchRenderHost) as any)?.destroy?.();
        const renders = 5;
        const start = now();
        for (let i = 0; i < renders; i++) {
            const ref = factory.create(BenchRenderHost, { injector: ctx }) as ComponentRef<BenchRenderHost>;
            await ref.render();
            await ref.destroy();
        }
        report('render designer tree', ms(start), `${renders} renders (60 children)`);
    } finally {
        await ctx.close();
        dom.window.close();
    }
}

async function benchCommonData(): Promise<void> {
    const rows = Array.from({ length: 1000 }, (_value, index) => ({
        id: `r${index}`,
        name: `node ${index}`,
        role: index % 2 === 0 ? 'writer' : 'reader'
    }));
    let filtered = filterDataTableRows(rows, {});
    let start = now();
    for (let round = 0; round < 200; round++) {
        filtered = filterDataTableRows(rows, { name: 'node 1', role: 'writer' });
    }
    report('common data-table filter 1k', ms(start), `${filtered.length} rows`);
    const entries = filterDataTableRows(rows, {});
    start = now();
    for (let round = 0; round < 100; round++) {
        sortDataTableRows(entries, 'name', 'asc');
    }
    report('common data-table sort 1k', ms(start), `${entries.length} rows`);

    const autocomplete = new AutoCompleteComponent();
    autocomplete.options = Array.from({ length: 1000 }, (_value, index) => ({
        label: `option ${index}`,
        value: `v${index}`,
        group: index < 500 ? 'first' : 'second'
    }));
    start = now();
    for (let round = 0; round < 300; round++) {
        autocomplete.selected = round % 1000;
        autocomplete.viewOptions;
    }
    report('common autocomplete 1k options', ms(start));

    const form = new DynamicFormComponent();
    form.schema = {
        fields: Array.from({ length: 80 }, (_value, index) => ({
            key: `f${index}`,
            type: 'text',
            label: `Field ${index}`,
            required: index % 2 === 0,
            rules: ['required', { type: 'maxLength', value: 40 }]
        }))
    };
    form.value = Object.fromEntries(Array.from({ length: 80 }, (_value, index) => [`f${index}`, `value ${index}`]));
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
    start = now();
    for (let round = 0; round < 500; round++) {
        form.validate();
    }
    report('common dynamic-form validate 80', ms(start));
}

const ROUNDS = Math.max(1, Math.floor(Number(process.env.COMPONENTS_BENCH_ROUNDS || '3')) || 1);

async function main(): Promise<void> {
    console.log(`components bench (effect ${process.version}, best of ${ROUNDS})`);
    for (let round = 0; round < ROUNDS; round++) {
        await benchCalibration();
        await benchReads();
        await benchBindings();
        await benchComputed();
        await benchList();
        await benchViewQueries();
        await benchToggleWrites();
        await benchRender();
        await benchRenderBindings();
        await benchCommonWidth();
        await benchCommonData();
    }
    printResults();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
