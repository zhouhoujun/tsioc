import expect = require('expect');
import * as ts from 'typescript';
import { Application } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentsModule } from '@tsdi/components';
import { ComponentRef } from '../../components/src/refs/component';
import { HtmlTemplateModule } from '../../components/html/src';
import { transpileAot } from '../src/activities/AotTransform';

function loadAotModule(source: string): Record<string, any> {
    const output = transpileAot('aot-template-ir.ts', source, { module: ts.ModuleKind.CommonJS });
    const module = { exports: {} as Record<string, any> };
    const nodeRequire = require;
    const localRequire = (id: string): any => id === '@tsdi/components'
        ? nodeRequire('../../components/src')
        : nodeRequire(id);
    const load = new Function('exports', 'require', 'module', output);
    load(module.exports, localRequire, module);
    return module.exports;
}

describe('AOT template IR', () => {
    it('embeds renderer-neutral IR for inline templates', () => {
        const emitted = transpileAot('aot-template-ir.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-host', template: '<div class="ir">{{label}}</div>' })
export class AotIrHost { label = 'hello'; }
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templateIR:');
    });

    it('renders controls, bindings and framework attributes from emitted IR', async () => {
        const exported = loadAotModule(`
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-ir-host',
    template: \`<div class="card">
        <span class="title">{{title}}</span>
        <ul><li class="row" v-for="item in items">{{item}}</li></ul>
        <input class="name" :value="title" />
        <button class="hit" @click="hit()">hit</button>
    </div>\`
})
export class AotIrHost {
    title = 'hello';
    items = ['a', 'b'];
    hits = 0;
    hit() { this.hits += 1; }
}
`);
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        const ctx = await Application.run(exported.AotIrHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotIrHost) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.title')?.textContent).toBe('hello');
            expect(Array.from(root.querySelectorAll('.row')).map((row: any) => row.textContent)).toEqual(['a', 'b']);
            expect((root.querySelector('input.name') as any)?.value).toBe('hello');
            root.querySelector('button.hit')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
            expect(ref.instance.hits).toBe(1);
        } finally {
            await ctx.close();
            dom.window.close();
        }
    });

    it('leaves block templates on the runtime parser', () => {
        const emitted = transpileAot('aot-template-ir-block.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-block', template: '@if (ok) { <span>yes</span> }' })
export class AotIrBlock { ok = true; }
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).not.toContain('templateIR:');
    });
});
