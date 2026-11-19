import expect = require('expect');
import * as ts from 'typescript';
import * as ioc from '@tsdi/ioc';
import { getClassRef } from '@tsdi/ioc';
import { transpileAot } from '../src/activities/AotTransform';

function loadModule(source: string): Record<string, any> {
    const output = transpileAot('aot-type-metadata.ts', source, { module: ts.ModuleKind.CommonJS });
    const module = { exports: {} as Record<string, any> };
    const nodeRequire = require;
    const localRequire = (id: string): any => id === '@tsdi/ioc'
        ? nodeRequire('../../ioc/src')
        : id === '@tsdi/components'
            ? nodeRequire('../../components/src')
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

    it('keeps the decorator pipeline for member decorators', () => {        const source = `
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
        expect(output).toContain('__aotDeco(Root,');
        expect(exported.Root.ƿAnn).toBeUndefined();

        const container = ioc.createInjector();
        ioc.InjectUtil.use(container, exported.Leaf, exported.Root);
        const root = container.get(exported.Root) as any;
        expect(root.leaf).toBeDefined();
        expect(root.leaf.value).toBe(3);
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
