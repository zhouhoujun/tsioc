import expect = require('expect');
import { Application } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { Component, ComponentsModule } from '../src';
import { ComponentRef } from '../src/refs/component';
import { XmlTemplateModule } from '../xml/src';
import { XmlTemplateCompiler } from '../xml/src/xml';

@Component({ selector: 'cache-child', template: `<span class="child">A</span>` })
class CacheChildA { }

@Component({ selector: 'cache-child', template: `<span class="child">B</span>` })
class CacheChildB { }

const HOST_TEMPLATE = `<section><div class="slot"><cache-child v-for="item in items"></cache-child></div></section>`;

@Component({ selector: 'cache-host-a', imports: [CacheChildA], template: HOST_TEMPLATE })
class CacheHostA {
    items = [1];
}

@Component({ selector: 'cache-host-b', imports: [CacheChildB], template: HOST_TEMPLATE })
class CacheHostB {
    items = [1];
}

@Component({ selector: 'cache-reuse-host', template: `<div class="reuse">{{label}}</div>` })
class CacheReuseHost {
    label = 'reuse';
}

@Suite('template factory cache isolation')
export class TemplateFactoryCacheIsolationTest {
    @Test('does not reuse a factory compiled with different component definitions')
    async keepsDefsSeparate() {
        const appA = await Application.run(CacheHostA, { deps: [XmlTemplateModule, ComponentsModule] });
        let textA = '';
        try {
            const ref = appA.runners.getRef(CacheHostA) as ComponentRef<CacheHostA>;
            textA = (ref.hostView.rootNodes[0] as any).querySelector('.child').textContent;
        } finally {
            await appA.close();
        }

        const appB = await Application.run(CacheHostB, { deps: [XmlTemplateModule, ComponentsModule] });
        try {
            const ref = appB.runners.getRef(CacheHostB) as ComponentRef<CacheHostB>;
            const textB = (ref.hostView.rootNodes[0] as any).querySelector('.child').textContent;
            expect(textA).toBe('A');
            expect(textB).toBe('B');
        } finally {
            await appB.close();
        }
    }

    @Test('reuses the compiled factory across Applications with identical inputs')
    async reusesAcrossApplications() {
        const proto = XmlTemplateCompiler.prototype as any;
        const original = proto.compile;
        let compiles = 0;
        proto.compile = function (...args: any[]) {
            compiles += 1;
            return original.apply(this, args);
        };
        try {
            const appA = await Application.run(CacheReuseHost, { deps: [XmlTemplateModule, ComponentsModule] });
            await appA.close();
            const first = compiles;
            expect(first).toBeGreaterThan(0);

            const appB = await Application.run(CacheReuseHost, { deps: [XmlTemplateModule, ComponentsModule] });
            let text = '';
            try {
                const ref = appB.runners.getRef(CacheReuseHost) as ComponentRef<CacheReuseHost>;
                text = (ref.hostView.rootNodes[0] as any).querySelector('.reuse').textContent;
            } finally {
                await appB.close();
            }
            expect(text).toBe('reuse');
            expect(compiles).toBe(first);
        } finally {
            proto.compile = original;
        }
    }
}
