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


    it('precompiles Attribute and Computed member metadata', async () => {
        const source = `
import { Attribute, Component, Computed } from '@tsdi/components';

@Component({ selector: 'aot-member-host', template: '<div class="value">{{doubled}}</div>' })
export class AotMemberHost {
    @Attribute() label = 'x';

    @Computed(['label'])
    get doubled() { return this.label + this.label; }
}
`;
        const emitted = transpileAot('aot-member.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(');
        expect(emitted).toContain('templateIR:');
        expect(emitted).toContain('propertyKey: "label"');

        const exported = loadAotModule(source);
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        const ctx = await Application.run(exported.AotMemberHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotMemberHost) as ComponentRef<any>;
            expect(ref.def.attributes?.length).toBe(1);
            expect(ref.def.computeds?.length).toBe(1);
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.getAttribute('class')).toBe('value');
            expect(root.textContent).toBe('xx');
            ref.instance.label = 'y';
            await Promise.resolve();
            expect(root.textContent).toBe('yy');
        } finally {
            await ctx.close();
            dom.window.close();
        }
    });


    it('precompiles view query metadata', async () => {
        const source = `
import { Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@tsdi/components';

@Component({
    selector: 'aot-query-host',
    template: '<div><span #inner></span><i class="row" v-for="item in items" #row></i></div>'
})
export class AotQueryHost {
    items = [1, 2];
    @ViewChild('inner') inner?: ElementRef;
    @ViewChildren('row') rows?: QueryList<ElementRef>;
}
`;
        const emitted = transpileAot('aot-query.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(');
        expect(emitted).toContain('viewChilds:');
        expect(emitted).toContain('viewChildrens:');
        expect(emitted).toContain('propertyKey: "inner"');

        const exported = loadAotModule(source);
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        const ctx = await Application.run(exported.AotQueryHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotQueryHost) as ComponentRef<any>;
            await Promise.resolve();
            await Promise.resolve();
            expect(ref.instance.inner).toBeTruthy();
            expect(ref.instance.rows?.length).toBe(2);
        } finally {
            await ctx.close();
            dom.window.close();
        }
    });

    it('embeds IR for block templates', () => {
        const emitted = transpileAot('aot-template-ir-block.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-block', template: '@if (ok) { <span>yes</span> } @else { <span>no</span> }' })
export class AotIrBlock { ok = true; }
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templateIR:');
        expect(emitted).toContain('v-if');
        expect(emitted).toContain('v-else');
    });

    it('leaves SVG templates on the runtime parser', () => {
        const emitted = transpileAot('aot-template-ir-svg.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-svg', template: '<svg><circle /></svg>' })
export class AotIrSvg {}
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).not.toContain('templateIR:');
    });
});
