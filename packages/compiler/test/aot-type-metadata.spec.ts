import expect = require('expect');
import * as ts from 'typescript';
import * as ioc from '@tsdi/ioc';
import { getClassRef } from '@tsdi/ioc';
import { reactive } from '../../components/src';
import { DefaultReactiveEffect } from '../../components/src/impl/effect';
import { transpileAot } from '../src/activities/AotTransform';

function loadModule(source: string): Record<string, any> {
    const output = transpileAot('aot-type-metadata.ts', source, { module: ts.ModuleKind.CommonJS });
    const module = { exports: {} as Record<string, any> };
    const nodeRequire = require;
    const localRequire = (id: string): any => id === '@tsdi/ioc'
        ? nodeRequire('../../ioc/src')
        : id === '@tsdi/components'
            ? nodeRequire('../../components/src')
            : id === '@tsdi/core'
                ? nodeRequire('../../core/src')
                : nodeRequire(id);
    const load = new Function('exports', 'require', 'module', output);
    load(module.exports, localRequire, module);
    return module.exports;
}

describe('AOT type metadata', () => {
    it('materializes ƿAnn without running the decorator pipeline', () => {
        const source = `
import { Injectable, Singleton, Providers } from '@tsdi/ioc';

export const TOKEN = 'TOKEN';

@Injectable()
@Singleton()
@Providers([{ provide: TOKEN, useValue: 7 }])
export class PrecompiledService {
    value = 1;
}
`;
        const exported = loadModule(source);
        const type = exported.PrecompiledService;
        const ref = getClassRef(type);

        expect(type.ƿAnn).toBeDefined();
        expect(type.ƿAnn().name).toEqual('PrecompiledService');
        expect(type.ƿAnn().type).toBe(type);
        expect(type.ƿAnn().singleton).toBe(true);
        expect(ref.hasMetadata('@Injectable')).toBe(true);
        expect(ref.hasMetadata('@Singleton')).toBe(true);
        expect(ref.classDecors.length).toBe(3);
        expect(ref.getAnnotation().providers.length).toBe(1);
    });

    it('injects precompiled constructor parameters', () => {
        const source = `
import { Injectable, Singleton } from '@tsdi/ioc';

@Singleton()
export class Leaf {
    value = 5;
}

@Injectable()
export class Root {
    constructor(readonly leaf: Leaf) {}
}
`;
        const exported = loadModule(source);
        const ref = getClassRef(exported.Root);
        const params = ref.getParameters('constructor');
        expect(params?.length).toBe(1);
        expect(params?.[0].type).toBe(exported.Leaf);

        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.Leaf, exported.Root);
        const root = container.get(exported.Root) as any;
        expect(root.leaf).toBeDefined();
        expect(root.leaf.value).toBe(5);
    });

    it('precompiles service property injection', () => {
        const source = `
import { Injectable, Autowired } from '@tsdi/ioc';

@Injectable()
export class Leaf {
    value = 3;
}

@Injectable()
export class Root {
    @Autowired(Leaf)
    leaf!: Leaf;
}
`;
        const output = transpileAot('aot-member.ts', source, { module: ts.ModuleKind.CommonJS });
        const exported = loadModule(source);
        expect(output).toContain('__aotType(Root,');
        expect(exported.Root.ƿAnn).toBeDefined();

        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.Leaf, exported.Root);
        const root = container.get(exported.Root) as any;
        expect(root.leaf).toBeDefined();
        expect(root.leaf.value).toBe(3);
    });


    it('precompiles constructor @Inject tokens into ƿprov', () => {
        const source = `
import { Inject, Injectable } from '@tsdi/ioc';

@Injectable()
export class InjectedService {
    constructor(@Inject('AOT_TOKEN') readonly value: string) {}
}
`;
        const emitted = transpileAot('aot-inject.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain('ƿprov');
        expect(emitted).toContain('AOT_TOKEN');

        const exported = loadModule(source);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.InjectedService);
        container.setValue('AOT_TOKEN', 'injected');
        const service = container.get(exported.InjectedService) as any;
        expect(service.value).toBe('injected');
    });


    it('precompiles @Optional tokens into ƿprov flags', () => {
        const source = `
import { Inject, Injectable, Optional } from '@tsdi/ioc';

@Injectable()
export class OptionalService {
    constructor(@Optional() @Inject('MISSING_TOKEN') readonly value?: string) {}
}
`;
        const emitted = transpileAot('aot-optional.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotFlags');
        expect(emitted).toContain('ƿprov');
        expect(emitted).toContain('Optional');

        const exported = loadModule(source);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.OptionalService);
        const service = container.get(exported.OptionalService) as any;
        expect(service.value == null).toBe(true);
    });


    it('precompiles @Autowired property injection metadata', () => {
        const source = `
import { Autowired, Injectable } from '@tsdi/ioc';

@Injectable()
export class PropertyInjectedService {
    @Autowired('PROP_TOKEN')
    value?: string;
}
`;
        const emitted = transpileAot('aot-prop.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain('propMetadatas');
        expect(emitted).toContain('PROP_TOKEN');

        const exported = loadModule(source);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.PropertyInjectedService);
        container.setValue('PROP_TOKEN', 'property-value');
        const service = container.get(exported.PropertyInjectedService) as any;
        expect(service.value).toBe('property-value');
    });


    it('precompiles class @Autorun runnables', () => {
        const source = `
import { Autorun, Injectable } from '@tsdi/ioc';

@Injectable()
@Autorun({ propertyKey: 'setup' })
export class AutorunService {
    ready = false;
    setup() { this.ready = true; }
}
`;
        const emitted = transpileAot('aot-autorun.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain("propertyKey: 'setup'");

        const exported = loadModule(source);
        expect(exported.AutorunService.ƿAnn().runnables?.length).toBe(1);
    });


    it('precompiles method @Autorun runnables', () => {
        const source = `
import { Autorun, Injectable } from '@tsdi/ioc';

@Injectable()
export class MethodAutorunService {
    ready = false;

    @Autorun()
    boot() { this.ready = true; }
}
`;
        const emitted = transpileAot('aot-method-autorun.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain('runnables');
        expect(emitted).toContain('decorType: "method"');

        const exported = loadModule(source);
        expect(exported.MethodAutorunService.ƿAnn().runnables?.length).toBe(1);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.MethodAutorunService);
        const service = container.get(exported.MethodAutorunService) as any;
        expect(service.ready).toBe(true);
    });


    it('precompiles @ProvidedIn registration metadata', () => {
        const source = `
import { Injectable, ProvidedIn } from '@tsdi/ioc';

export class TargetToken {}

@Injectable()
@ProvidedIn(TargetToken)
export class ProvidedService extends TargetToken {}
`;
        const emitted = transpileAot('aot-provided-in.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain('ProvidedIn');
        expect(emitted).toContain('target: TargetToken');

        const exported = loadModule(source);
        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.ProvidedService);
        const providers = container.getRuntime().getTypeProvider(exported.TargetToken) as any[];
        expect(providers.some(provider => provider === exported.ProvidedService
            || provider?.provide === exported.TargetToken)).toBe(true);
    });


    it('precompiles @Pipe selector metadata', () => {
        const source = `
import { Pipe } from '@tsdi/core';

@Pipe('upper')
export class UpperPipe {
    transform(value: string) { return value.toUpperCase(); }
}
`;
        const emitted = transpileAot('aot-pipe.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain("selector: 'upper'");
        expect(emitted).toContain("provide: 'upper'");

        const exported = loadModule(source);
        const def = getClassRef(exported.UpperPipe).getAnnotation() as any;
        expect(def.selector).toBe('upper');
        expect(def.pure).toBe(true);
        expect(def.provides).toContain('upper');
    });


    it('precompiles NoReactive member metadata', () => {
        const source = `
import { Component, NoReactive } from '@tsdi/components';

@Component({ selector: 'aot-noreactive', template: '<div></div>' })
export class AotNoReactive {
    @NoReactive() cache = 1;
    shown = 2;
}
`;
        const emitted = transpileAot('aot-noreactive.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotComponent(');
        expect(emitted).toContain('noReactive:');
        expect(emitted).toContain('cache');

        const exported = loadModule(source);
        const annotation: any = getClassRef(exported.AotNoReactive).getAnnotation();
        expect(annotation.noReactive).toContain('cache');

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new exported.AotNoReactive(), effect);
        let cacheRuns = 0;
        effect.run(() => { cacheRuns += 1; void state.cache; });
        state.cache = 3;
        expect(cacheRuns).toBe(1);

        let shownRuns = 0;
        effect.run(() => { shownRuns += 1; void state.shown; });
        state.shown = 4;
        expect(shownRuns).toBe(2);
    });


    it('precompiles @Module metadata', () => {
        const source = `
import { Injectable, Module } from '@tsdi/ioc';

@Injectable()
export class ModuleService {}

@Module({
    providers: [ModuleService],
    declarations: [ModuleService],
    imports: [[ModuleService]],
    exports: [ModuleService]
})
export class AotModule {}
`;
        const emitted = transpileAot('aot-module.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(emitted).toContain('__aotType(');
        expect(emitted).toContain('Module,');
        expect(emitted).toContain('providers');

        const exported = loadModule(source);
        const annotation: any = getClassRef(exported.AotModule).getAnnotation();
        expect(annotation.module).toBe(true);
        expect(annotation.providers).toContain(exported.ModuleService);
        expect(annotation.declarations).toContain(exported.ModuleService);
        expect(annotation.imports).toContain(exported.ModuleService);
        expect(annotation.exports).toContain(exported.ModuleService);
    });

    it('materializes component and directive definitions', () => {
        const source = `
import { Component, Directive } from '@tsdi/components';

@Component({ selector: 'x-card', template: '<div class="card"></div>', providers: [{ provide: 'CARD', useValue: 1 }] })
export class Card {
    title = 'card';
}

@Directive({ selector: 'x-attr' })
export class AttrDirective {}
`;
        const exported = loadModule(source);
        const cardRef = getClassRef(exported.Card);
        const card = cardRef.getAnnotation() as any;
        expect(card.selector).toBe('x-card');
        expect(card.template).toBe('<div class="card"></div>');
        expect(card.dirType).toBe(8);
        expect(card.exportProviders.length).toBe(1);
        expect(card.providers.length).toBe(1);
        expect(Array.isArray(card.providers[0])).toBe(false);
        expect(card.attributes).toEqual([]);
        expect(card.viewChilds).toEqual([]);
        expect(typeof card.ƿfac).toBe('function');

        const directiveRef = getClassRef(exported.AttrDirective);
        const directive = directiveRef.getAnnotation() as any;
        expect(directive.selector).toBe('x-attr');
        expect(directive.static).toBe(false);
        expect(directive.exportProviders.some((p: any) => p.useValue?.selector === 'x-attr')).toBe(true);
        expect(typeof directive.ƿfac).toBe('function');
    });
});
