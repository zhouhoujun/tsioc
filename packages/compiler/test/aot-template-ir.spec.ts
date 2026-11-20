import expect = require('expect');
import * as ts from 'typescript';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Application } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentsModule } from '@tsdi/components';
import { ComponentRef } from '../../components/src/refs/component';
import { HtmlTemplateModule, HtmlTemplateParser, HTML_COMPILER_OPTIONS } from '../../components/html/src';
import { XmlTemplateModule } from '../../components/xml/src';
import { ConsoleTemplateModule } from '../../components/console/src';
import { transpileAot } from '../src/activities/AotTransform';

function loadAotOutput(output: string): Record<string, any> {
    const module = { exports: {} as Record<string, any> };
    const nodeRequire = require;
    const localRequire = (id: string): any => id === '@tsdi/components'
        ? nodeRequire('../../components/src')
        : nodeRequire(id);
    const load = new Function('exports', 'require', 'module', output);
    load(module.exports, localRequire, module);
    return module.exports;
}

function loadAotModule(source: string): Record<string, any> {
    return loadAotOutput(transpileAot('aot-template-ir.ts', source, { module: ts.ModuleKind.CommonJS }));
}

describe('AOT template IR', () => {
    it('embeds a precompiled template plan for inline templates', () => {
        const emitted = transpileAot('aot-template-ir.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-host', template: '<div class="ir">{{label}}</div>' })
export class AotIrHost { label = 'hello'; }
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');
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
        expect(emitted).toContain('templatePlan:');
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
        // The factory description is emitted as JS data, not a JSON string.
        expect(emitted).toContain('templatePlan: {');
        expect(emitted).not.toContain('templatePlan: "{');

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

    it('executes structural binding plans without the parser', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-if',
    template: '<div class="root"><span class="always">{{title}}</span><span class="maybe" v-if="show">yes</span><span class="other" v-else>no</span><button class="toggle" @click="toggle()">t</button></div>'
})
export class AotPlanIf {
    title = 'if';
    show = true;
    toggle() { this.show = !this.show; }
}
`;
        const emitted = transpileAot('aot-plan-if.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');
        expect(emitted).toContain('v-if');

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
            ctx = await Application.run(exported.AotPlanIf, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanIf) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.always')?.textContent).toBe('if');
            expect(root.querySelector('.maybe')?.textContent).toBe('yes');
            expect(root.querySelector('.other')).toBeFalsy();
            root.querySelector('button.toggle')?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(root.querySelector('.maybe')).toBeFalsy();
            expect(root.querySelector('.other')?.textContent).toBe('no');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('executes v-for binding plans without the parser', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-for',
    template: '<div class="root"><ul><li class="row" v-for="(item, index) in items">{{index}}:{{item}}</li></ul><button class="add" @click="add()">add</button></div>'
})
export class AotPlanFor {
    items = ['a', 'b'];
    add() { this.items = [...this.items, 'c']; }
}
`;
        const emitted = transpileAot('aot-plan-for.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');
        expect(emitted).toContain('v-for');

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
            ctx = await Application.run(exported.AotPlanFor, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanFor) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            const rows = () => Array.from(root.querySelectorAll('.row') as ArrayLike<any>).map((row: any) => row.textContent);
            expect(rows()).toEqual(['0:a', '1:b']);
            root.querySelector('button.add')?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(rows()).toEqual(['0:a', '1:b', '2:c']);
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('registers local refs from binding plans', async () => {
        const source = `
import { Component, ElementRef, ViewChild } from '@tsdi/components';

@Component({
    selector: 'aot-plan-ref',
    template: '<div class="root"><span #inner class="inner">{{label}}</span></div>'
})
export class AotPlanRef {
    label = 'ref';
    @ViewChild('inner') inner?: ElementRef;
}
`;
        const emitted = transpileAot('aot-plan-ref.ts', source, { module: ts.ModuleKind.CommonJS });
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
            ctx = await Application.run(exported.AotPlanRef, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanRef) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.inner')?.textContent).toBe('ref');
            expect(ref.instance.inner).toBeTruthy();
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('renders projection outlets from binding plans', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-slot',
    template: '<section class="slot"><v-content></v-content></section>'
})
export class AotPlanSlot {}

@Component({
    selector: 'aot-plan-proj',
    imports: [AotPlanSlot],
    template: '<aot-plan-slot><span class="content">{{title}}</span></aot-plan-slot>'
})
export class AotPlanProj {
    title = 'projected';
}
`;
        const emitted = transpileAot('aot-plan-proj.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');
        expect(emitted).toContain('v-content');

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
            ctx = await Application.run(exported.AotPlanProj, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanProj) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.slot')?.textContent).toBe('projected');
            expect(root.querySelector('.content')?.textContent).toBe('projected');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('renders template outlets from binding plans', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-outlet',
    template: '<div class="root"><div v-templateOutlet="row" :templateOutletContext="item"></div><v-template #row><label class="line" v-for="line in lines">{{line}}</label></v-template></div>'
})
export class AotPlanOutlet {
    item = { lines: ['alpha', 'beta'] };
}
`;
        const emitted = transpileAot('aot-plan-outlet.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');
        expect(emitted).toContain('v-template');

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
            ctx = await Application.run(exported.AotPlanOutlet, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanOutlet) as ComponentRef<any>;
            await ref.render();
            const root = ref.hostView.rootNodes[0] as any;
            const lines = Array.from(root.querySelectorAll('.line') as ArrayLike<any>).map((line: any) => line.textContent);
            expect(lines).toEqual(['alpha', 'beta']);
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('resolves ViewChild TemplateRefs from binding plans', async () => {
        const source = `
import { Component, TemplateRef, ViewChild } from '@tsdi/components';

@Component({
    selector: 'aot-plan-tpl-ref',
    template: '<div class="root"><v-template #sys><p class="sys">system</p></v-template></div>'
})
export class AotPlanTplRef {
    @ViewChild('sys') sys?: TemplateRef<any>;
}
`;
        const emitted = transpileAot('aot-plan-tpl-ref.ts', source, { module: ts.ModuleKind.CommonJS });
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
            ctx = await Application.run(exported.AotPlanTplRef, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanTplRef) as ComponentRef<any>;
            expect(ref.instance.sys).toBeTruthy();
            expect(typeof ref.instance.sys?.createEmbeddedView).toBe('function');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('matches directive attribute selectors in binding plans', async () => {
        const source = `
import { Component, Directive, ElementRef } from '@tsdi/components';

@Directive({ selector: '[type=button]' })
export class AotPlanTypeButton {
    constructor(elementRef: ElementRef) {
        elementRef.nativeElement.setAttribute('data-directive', 'button');
    }
}

@Component({
    selector: 'aot-plan-selector',
    imports: [AotPlanTypeButton],
    template: '<div><button type="text" class="no">no</button><button type="button" class="yes">yes</button></div>'
})
export class AotPlanSelector {}
`;
        const emitted = transpileAot('aot-plan-selector.ts', source, { module: ts.ModuleKind.CommonJS });
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
            ctx = await Application.run(exported.AotPlanSelector, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanSelector) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('button.yes')?.getAttribute('data-directive')).toBe('button');
            expect(root.querySelector('button.no')?.getAttribute('data-directive')).toBeFalsy();
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('renders @if block templates from binding plans', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-block',
    template: '<div class="root">@if (show) {<span class="a">A</span>} @else {<span class="b">B</span>}</div>'
})
export class AotPlanBlock {
    show = true;
}
`;
        const emitted = transpileAot('aot-plan-block.ts', source, { module: ts.ModuleKind.CommonJS });
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
            ctx = await Application.run(exported.AotPlanBlock, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanBlock) as ComponentRef<any>;
            await ref.render();
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.a')?.textContent).toBe('A');
            expect(root.querySelector('.b')).toBeFalsy();
            ref.instance.show = false;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(root.querySelector('.a')).toBeFalsy();
            expect(root.querySelector('.b')?.textContent).toBe('B');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('renders transparent v-for templates from binding plans', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-tpl-for',
    template: '<ul class="root"><template v-for="item in items"><li class="row">{{item}}</li><li class="sep">|</li></template></ul>'
})
export class AotPlanTplFor {
    items = ['a', 'b'];
}
`;
        const emitted = transpileAot('aot-plan-tpl-for.ts', source, { module: ts.ModuleKind.CommonJS });
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
            ctx = await Application.run(exported.AotPlanTplFor, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanTplFor) as ComponentRef<any>;
            await ref.render();
            const root = ref.hostView.rootNodes[0] as any;
            const rows = Array.from(root.querySelectorAll('.row') as ArrayLike<any>).map((row: any) => row.textContent);
            expect(rows).toEqual(['a', 'b']);
            expect(root.querySelectorAll('.sep').length).toBe(2);
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('renders AOT templateUrl plans without reading the template at runtime', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aot-url-plan-'));
        const tsFile = path.join(dir, 'external.ts');
        const htmlFile = path.join(dir, 'external.html');
        try {
            fs.writeFileSync(htmlFile, '<section class="external"><span class="title">{{title}}</span></section>', 'utf-8');
            const source = `
import { Component } from '@tsdi/components';

@Component({ selector: 'aot-url-plan', templateUrl: './external.html' })
export class AotUrlPlan {
    title = 'external-plan';
}
`;
            fs.writeFileSync(tsFile, source, 'utf-8');
            const emitted = transpileAot(tsFile, source, { module: ts.ModuleKind.CommonJS });
            expect(emitted).toContain('templatePlan: {');

            // The build artifact must not need the source template file later.
            fs.rmSync(htmlFile);

            const exported = loadAotOutput(emitted);
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
                ctx = await Application.run(exported.AotUrlPlan, {
                    deps: [HtmlTemplateModule, ComponentsModule],
                    providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
                });
                await new Promise(resolve => setTimeout(resolve, 0));
                const ref = ctx.runners.getRef(exported.AotUrlPlan) as ComponentRef<any>;
                const root = ref.hostView.rootNodes[0] as any;
                expect(root.querySelector('.title')?.textContent).toBe('external-plan');
                expect(parses).toBe(0);
            } finally {
                proto.parse = originalParse;
                await ctx?.close();
                dom.window.close();
            }
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('precompiles templates when the class uses runtime decorators', async () => {
        const source = `
import { Component } from '@tsdi/components';

function LegacyMark(target: any, key: string) { void target; void key; }

@Component({
    selector: 'aot-fallback-plan',
    template: '<div class="fallback">{{title}}</div>'
})
export class AotFallbackPlan {
    @LegacyMark title = 'fallback-plan';
}
`;
        const emitted = transpileAot('aot-fallback-plan.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotDeco(');
        expect(emitted).toContain('templatePlan: {');

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
            ctx = await Application.run(exported.AotFallbackPlan, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotFallbackPlan) as ComponentRef<any>;
            await ref.render();
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.className).toContain('fallback');
            expect(root.textContent).toBe('fallback-plan');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('renders @switch block templates from binding plans', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-plan-switch',
    template: '<div class="root">@switch (kind) {@case ("a") {<span class="a">A</span>} @case ("b") {<span class="b">B</span>} @default {<span class="d">D</span>}}</div>'
})
export class AotPlanSwitch {
    kind = 'a';
}
`;
        const emitted = transpileAot('aot-plan-switch.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan: {');

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
            ctx = await Application.run(exported.AotPlanSwitch, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotPlanSwitch) as ComponentRef<any>;
            await ref.render();
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.a')?.textContent).toBe('A');
            expect(root.querySelector('.d')).toBeFalsy();

            ref.instance.kind = 'z';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(root.querySelector('.a')).toBeFalsy();
            expect(root.querySelector('.d')?.textContent).toBe('D');

            ref.instance.kind = 'b';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(root.querySelector('.d')).toBeFalsy();
            expect(root.querySelector('.b')?.textContent).toBe('B');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('precompiles templates with custom interpolation delimiters', async () => {
        const source = `
import { Component } from '@tsdi/components';

@Component({
    selector: 'aot-custom-delimiter',
    template: '<div class="custom">[[title]]</div>'
})
export class AotCustomDelimiter {
    title = 'custom-value';
}
`;
        const delimiters: [string, string] = ['[[', ']]'];
        const emitted = transpileAot('aot-custom-delimiter.ts', source, {
            module: ts.ModuleKind.CommonJS,
            delimiters
        });
        expect(emitted).toContain('templatePlan: {');
        expect(emitted).toContain('delimiter: "[[]]"');

        const exported = loadAotOutput(emitted);
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
            ctx = await Application.run(exported.AotCustomDelimiter, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [
                    { provide: DOCUMENT, useValue: dom.window.document },
                    { provide: HTML_COMPILER_OPTIONS, useValue: { delimiters } }
                ]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotCustomDelimiter) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.className).toContain('custom');
            expect(root.textContent).toBe('custom-value');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });

    it('embeds a precompiled template plan for block templates', () => {
        const emitted = transpileAot('aot-template-ir-block.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-block', template: '@if (ok) { <span>yes</span> } @else { <span>no</span> }' })
export class AotIrBlock { ok = true; }
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan:');
        expect(emitted).toContain('v-if');
        expect(emitted).toContain('v-else');
    });

    it('precompiles SVG and MathML templates with namespaces', async () => {
        const emitted = transpileAot('aot-template-ir-svg.ts', `
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-svg', template: '<div class="root"><svg viewBox="0 0 10 10"><circle class="dot" cx="1" cy="1" r="1" /></svg><math><mi class="var">x</mi></math></div>' })
export class AotIrSvg {}
`, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('templatePlan: {');
        expect(emitted).toContain('http://www.w3.org/2000/svg');
        expect(emitted).toContain('http://www.w3.org/1998/Math/MathML');

        const exported = loadAotModule(`
import { Component } from '@tsdi/components';
@Component({ selector: 'aot-ir-svg', template: '<div class="root"><svg viewBox="0 0 10 10"><circle class="dot" cx="1" cy="1" r="1" /></svg><math><mi class="var">x</mi></math></div>' })
export class AotIrSvg {}
`);
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
            ctx = await Application.run(exported.AotIrSvg, {
                deps: [HtmlTemplateModule, ComponentsModule],
                providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
            });
            await new Promise(resolve => setTimeout(resolve, 0));
            const ref = ctx.runners.getRef(exported.AotIrSvg) as ComponentRef<any>;
            const root = ref.hostView.rootNodes[0] as any;
            const svg = root.querySelector('svg');
            const dot = root.querySelector('.dot');
            const math = root.querySelector('math');
            const variable = root.querySelector('.var');
            expect(svg?.namespaceURI).toBe('http://www.w3.org/2000/svg');
            expect(dot?.namespaceURI).toBe('http://www.w3.org/2000/svg');
            expect(svg?.getAttribute('viewBox')).toBe('0 0 10 10');
            expect(math?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
            expect(variable?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
            expect(parses).toBe(0);
        } finally {
            proto.parse = originalParse;
            await ctx?.close();
            dom.window.close();
        }
    });
});
