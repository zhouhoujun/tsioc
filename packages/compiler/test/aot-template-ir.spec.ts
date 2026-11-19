import expect = require('expect');
import * as ts from 'typescript';
import { Application } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentsModule } from '@tsdi/components';
import { ComponentRef } from '../../components/src/refs/component';
import { HtmlTemplateModule, HtmlTemplateParser } from '../../components/html/src';
import { XmlTemplateModule } from '../../components/xml/src';
import { ConsoleTemplateModule } from '../../components/console/src';
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


    it('renders emitted IR with the XML renderer', async () => {
        const exported = loadAotModule(`
import { Component } from '@tsdi/components';

@Component({ selector: 'aot-ir-xml-host', template: '<div class="xml-ir"><span class="label">{{label}}</span></div>' })
export class AotIrXmlHost {
    label = 'xml';
}
`);
        const ctx = await Application.run(exported.AotIrXmlHost, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotIrXmlHost) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.label')?.textContent).toBe('xml');
        } finally {
            await ctx.close();
        }
    });


    it('renders emitted IR with the console renderer', async () => {
        const exported = loadAotModule(`
import { Component } from '@tsdi/components';

@Component({ selector: 'aot-ir-console-host', template: '<div class="console-ir"><span class="label">{{label}}</span></div>' })
export class AotIrConsoleHost {
    label = 'console';
}
`);
        const ctx = await Application.run(exported.AotIrConsoleHost, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotIrConsoleHost) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.label')?.textContent).toBe('console');
        } finally {
            await ctx.close();
        }
    });


    it('precompiles component constructor injection', async () => {
        const source = `
import { Component, Inject, Optional } from '@tsdi/components';

@Component({ selector: 'aot-ctor-host', template: '<div class="value">{{value}}</div>' })
export class AotCtorHost {
    constructor(@Optional() @Inject('AOT_CTOR') readonly value?: string) {}
}
`;
        const emitted = transpileAot('aot-ctor.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(');
        expect(emitted).toContain('methodMetadatas');
        expect(emitted).toContain('__aotFlags');

        const exported = loadAotModule(source);
        const ctx = await Application.run(exported.AotCtorHost, {
            deps: [XmlTemplateModule, ComponentsModule],
            providers: [{ provide: 'AOT_CTOR', useValue: 'injected' }]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotCtorHost) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.value')?.textContent).toBe('injected');
        } finally {
            await ctx.close();
        }
    });


    it('keeps selector-less view queries on the runtime pipeline', () => {
        const emitted = transpileAot('aot-query-fallback.ts', `
import { Component, ElementRef, ViewChild } from '@tsdi/components';

@Component({ selector: 'aot-query-fallback', template: '<div><span #inner></span></div>' })
export class AotQueryFallback {
    @ViewChild()
    inner?: ElementRef;
}
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotDeco(');
        expect(emitted).not.toContain('viewChilds:');
    });


    it('precompiles component property injection', async () => {
        const source = `
import { Autowired, Component } from '@tsdi/components';

@Component({ selector: 'aot-prop-host', template: '<div class="value">{{value}}</div>' })
export class AotPropHost {
    @Autowired('AOT_PROP')
    value?: string;
}
`;
        const emitted = transpileAot('aot-component-prop.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(');
        expect(emitted).toContain('propMetadatas');

        const exported = loadAotModule(source);
        const ctx = await Application.run(exported.AotPropHost, {
            deps: [XmlTemplateModule, ComponentsModule],
            providers: [{ provide: 'AOT_PROP', useValue: 'property' }]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotPropHost) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.value')?.textContent).toBe('property');
        } finally {
            await ctx.close();
        }
    });


    it('precompiles component Autorun runnables', async () => {
        const source = `
import { Autorun, Component } from '@tsdi/components';

@Component({ selector: 'aot-autorun-host', template: '<div></div>' })
export class AotAutorunHost {
    ready = false;

    @Autorun()
    boot() { this.ready = true; }
}
`;
        const emitted = transpileAot('aot-component-autorun.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(');
        expect(emitted).toContain('runnables');

        const exported = loadAotModule(source);
        const ctx = await Application.run(exported.AotAutorunHost, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotAutorunHost) as ComponentRef<any>;
            expect(ref.instance.ready).toBe(true);
        } finally {
            await ctx.close();
        }
    });


    it('precompiles Attribute accessors and passes inputs to child components', async () => {
        const source = `
import { Attribute, Component } from '@tsdi/components';

@Component({ selector: 'aot-attr-child', template: '<span class="value">{{label}}</span>' })
export class AotAttrChild {
    private _label = '';

    @Attribute()
    set label(value: string) { this._label = value; }
    get label() { return this._label; }
}

@Component({ selector: 'aot-attr-parent', imports: [AotAttrChild], template: '<aot-attr-child label="hello"></aot-attr-child>' })
export class AotAttrParent {}
`;
        const emitted = transpileAot('aot-attr-accessor.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(AotAttrChild');
        expect(emitted).toContain('attributes:');

        const exported = loadAotModule(source);
        const ctx = await Application.run(exported.AotAttrParent, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(exported.AotAttrParent) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.value')?.textContent).toBe('hello');
        } finally {
            await ctx.close();
        }
    });


    it('emits and executes binding plans for simple templates', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-host',
    template: '<div class="card"><span class="title">{{title}}</span><button class="hit" @click="hit()">go</button><input :value="title" /></div>'
})
export class AotPlanHost {
    title = 'plan';
    hits = 0;
    hit() { this.hits += 1; }
}
`;
        const emitted = transpileAot('aot-plan.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');

        const exported = loadAotModule(source);
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        const proto = HtmlTemplateParser.prototype as any;
        const originalParse = proto.parse;
        let parses = 0;
        proto.parse = function (...args: any[]) {
            parses += 1;
            return originalParse.apply(this, args);
        };
        let ctx: any;
        try {
            ctx = await Application.run(exported.AotPlanHost, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            const ref = ctx.runners.getRef(exported.AotPlanHost) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.title')?.textContent).toBe('plan');
            expect((root.querySelector('input') as any)?.value).toBe('plan');
            root.querySelector('button.hit')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
            expect(ref.instance.hits).toBe(1);
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });


    it('executes binding plans with XML and console renderers', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({ selector: 'aot-plan-multi', template: '<div><span class="title">{{title}}</span></div>' })
export class AotPlanMulti {
    title = 'multi';
}
`;
        const exported = loadAotModule(source);
        for (const deps of [[XmlTemplateModule, ComponentsModule], [ConsoleTemplateModule, ComponentsModule]]) {
            const ctx = await Application.run(exported.AotPlanMulti, { deps });
            try {
                const ref = ctx.runners.getRef(exported.AotPlanMulti) as ComponentRef<any>;
                const root = ref.hostView.rootNodes[0] as any;
                expect(root.querySelector('.title')?.textContent).toBe('multi');
            } finally {
                await ctx.close();
            }
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
