import { AbstractType, typeAnn } from '../types';
import type { DecoratorFn, DecoratorType } from './define';

/**
 * Small global index used by precompiled metadata. Build-time metadata stores
 * class references by name; the runtime resolves them once the class is
 * defined, without re-reading decorators.
 *
 * This is intentionally a plain map (lookup happens during application setup,
 * not on hot paths).
 */
const TYPES_BY_NAME = new Map<string, AbstractType>();

export function registerPrecompiledType(type: AbstractType, name?: string): void {
    const key = name || type?.name;
    if (key && type) {
        TYPES_BY_NAME.set(key, type);
    }
}

export function getPrecompiledType(name: string): AbstractType | undefined {
    return TYPES_BY_NAME.get(name) || TYPES_BY_NAME.get(String(name || '').split('.').pop()!);
}

export function clearPrecompiledTypes(): void {
    TYPES_BY_NAME.clear();
}


export type PrecompiledDecoratorKind = DecoratorType;

export interface PrecompiledDecoratorRecord {
    /** Evaluated decorator function (the value the decorator expression returns). */
    decorator: Function;
    kind: PrecompiledDecoratorKind;
    propertyKey?: string | symbol;
    parameterIndex?: number;
    /** Static members receive the class constructor instead of its prototype. */
    static?: boolean;
}

export const PRECOMPILED_CLASS = 0;
export const PRECOMPILED_PROPERTY = 1;
export const PRECOMPILED_METHOD = 2;
export const PRECOMPILED_PARAMETER = 3;

/**
 * Compact build-time record: `[decorator, kind, propertyKey?, parameterIndex?]`.
 * Generated bundles use this form to avoid repeating property names for every
 * decorated member.
 */
export type CompactPrecompiledDecoratorRecord = [
    decorator: Function,
    kind: typeof PRECOMPILED_CLASS | typeof PRECOMPILED_PROPERTY | typeof PRECOMPILED_METHOD | typeof PRECOMPILED_PARAMETER
        | 4 | 5 | 6,
    propertyKey?: string | symbol,
    parameterIndex?: number
];

const COMPACT_KINDS: PrecompiledDecoratorKind[] = ['class', 'property', 'method', 'parameter'];
const PRECOMPILED_STATIC = 4;

/**
 * Apply decorator functions collected by the build compiler in one batch.
 *
 * The generated module replaces TypeScript's per-decorator `__decorate` helper
 * calls with a single call, so decorator expressions are evaluated and applied
 * at class-definition time without the decorator syntax/helper overhead.
 */
export function applyPrecompiledDecorators(
    target: Function,
    records: Array<PrecompiledDecoratorRecord | CompactPrecompiledDecoratorRecord>
): void {
    if (!target || !records?.length) {
        return;
    }
    const prototype: any = (target as any).prototype;
    for (const entry of records) {
        let decorator: any;
        let kind: PrecompiledDecoratorKind;
        let propertyKey: string | symbol | undefined;
        let parameterIndex: number | undefined;
        let isStatic = false;
        if (Array.isArray(entry)) {
            decorator = entry[0];
            const kindIndex = entry[1];
            isStatic = kindIndex >= PRECOMPILED_STATIC;
            kind = COMPACT_KINDS[isStatic ? kindIndex - PRECOMPILED_STATIC : kindIndex] ?? 'property';
            propertyKey = entry[2];
            parameterIndex = entry[3];
        } else {
            decorator = entry.decorator;
            kind = entry.kind;
            propertyKey = entry.propertyKey;
            parameterIndex = entry.parameterIndex;
            isStatic = entry.static === true;
        }
        const owner = isStatic ? target : prototype;
        if (typeof decorator !== 'function') {
            continue;
        }
        switch (kind) {
            case 'class':
                decorator(target);
                break;
            case 'property':
                // Match TypeScript's __decorate call shape (target, key, desc).
                decorator(owner, propertyKey, undefined);
                break;
            case 'method': {
                const key = propertyKey as string;
                const descriptor = key ? Object.getOwnPropertyDescriptor(owner, key) : undefined;
                const result = decorator(owner, propertyKey, descriptor);
                if (result && key) {
                    Object.defineProperty(owner, key, result);
                }
                break;
            }
            case 'parameter': {
                const parameterOwner = propertyKey === undefined || propertyKey === 'constructor'
                    ? target
                    : owner;
                decorator(parameterOwner, propertyKey, parameterIndex);
                break;
            }
            default:
                break;
        }
    }
}


/**
 * One class-level decorator recorded by the AOT transformer.
 *
 * The generated module keeps the decorator expression (so `getDefines()` /
 * `hasMetadata()` still resolve identical definitions) but skips the runtime
 * decorator factory + dispatch pipeline; the annotation fields are already
 * present in the precompiled type definition.
 */
export interface PrecompiledTypeDecoratorRecord {
    decor: DecoratorFn;
    decorator?: string;
    metadata?: any;
}

/** Compact tuple emitted by the AOT transformer: `[decorator, metadata]`. */
export type PrecompiledTypeDecoratorEntry = PrecompiledTypeDecoratorRecord | [Function, any];

const PRECOMPILED_TYPE_DEFINES = Symbol('__AOT_TYPE_DEFINES');

/**
 * Install a fully materialized `ƿAnn` definition for a class.
 *
 * `getDef()` reads the definition without scanning decorators, and
 * `ClassRef` replays only the compact decorator records (no option factories,
 * no runtime handler chain) when it is first created.
 */
export function applyPrecompiledType(
    target: Function,
    metadata: Record<string, any>,
    records?: PrecompiledTypeDecoratorEntry[],
    mergeMetadata = false
): void {
    if (!target) {
        return;
    }
    const def = metadata && typeof metadata === 'object' ? metadata : {};
    def.type = target;
    if (!def.name) {
        def.name = target.name;
    }
    if (Array.isArray(def.propMetadatas)) {
        def.propMetadatas = new Map(def.propMetadatas.map(([key, value]: [any, any]) =>
            [key, Array.isArray(value) ? value : [value]]
        ));
    }
    if (Array.isArray(def.methodMetadatas)) {
        def.methodMetadatas = new Map(def.methodMetadatas);
    }
    if (records?.length) {
        applyRunnableDefines(def, records);
        if (mergeMetadata) {
            // Component/Directive keep the decorator options object as their
            // definition. Merge the emitted option metadata into it so both
            // copies point at the same runtime values.
            for (let i = 0, len = records.length; i < len; i++) {
                const record = records[i] as any;
                const meta = Array.isArray(record) ? record[1] : record?.metadata;
                if (meta && typeof meta === 'object') {
                    Object.assign(def, meta);
                    if (meta.provide !== undefined) {
                        (def.provides || (def.provides = []));
                        if (def.provides.indexOf(meta.provide) < 0) {
                            def.provides.push(meta.provide);
                        }
                    }
                }
            }
        } else {
            applyTypeMetadataFields(def, records);
        }
    }
    (target as any)[typeAnn] = () => def;
    (target as any)[PRECOMPILED_TYPE_DEFINES] = records ?? [];
}


function isClassValue(value: any): boolean {
    return typeof value === 'function' && !!value.prototype;
}

function isPlainObjectValue(value: any): boolean {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function collectModuleValues(input: any, predicate: (value: any) => boolean, descend = true): any[] {
    const result: any[] = [];
    const visit = (value: any): void => {
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (descend && isPlainObjectValue(value) && !value.module) {
            Object.keys(value).forEach(key => visit(value[key]));
            return;
        }
        if (predicate(value)) {
            result.push(value);
        }
    };
    visit(input);
    return result;
}

function applyModuleMetadata(def: Record<string, any>, meta: Record<string, any>): void {
    def.module = true;
    if (meta.providedIn !== undefined) {
        def.providedIn = meta.providedIn;
    }
    if (meta.baseURL !== undefined) {
        def.baseURL = meta.baseURL;
    }
    if (meta.debug !== undefined) {
        def.debug = meta.debug;
    }
    if (Array.isArray(meta.providers) && meta.providers.length) {
        (def.providers || (def.providers = []));
        def.providers.push(...meta.providers);
    }
    if (meta.imports) {
        def.imports = collectModuleValues(meta.imports, value =>
            isClassValue(value) || (!!value && typeof value === 'object' && !!value.module)
        );
    }
    if (meta.exports) {
        def.exports = collectModuleValues(meta.exports, isClassValue);
    }
    if (meta.declarations) {
        def.declarations = collectModuleValues(meta.declarations, isClassValue);
    }
    if (meta.bootstrap) {
        def.bootstrap = collectModuleValues(meta.bootstrap, isClassValue);
    }
}

function applyRunnableDefines(def: Record<string, any>, records: PrecompiledTypeDecoratorEntry[]): void {
    for (let i = 0, len = records.length; i < len; i++) {
        const record = records[i] as any;
        const decor = Array.isArray(record) ? record[0] : record?.decor;
        const meta = Array.isArray(record) ? record[1] : record?.metadata;
        if (!meta || typeof meta !== 'object') {
            continue;
        }
        if (decor?.decorator === '@ProvidedIn') {
            def.aotProvidedIn = meta;
            continue;
        }
        if (decor?.decorator !== '@Autorun') {
            continue;
        }
        const runnables = (def.runnables || (def.runnables = []));
        runnables.push({ ...meta, decorType: 'class' });
    }
}

function applyTypeMetadataFields(def: Record<string, any>, records: PrecompiledTypeDecoratorEntry[]): void {
    for (let i = 0, len = records.length; i < len; i++) {
        const record = records[i] as any;
        const meta = Array.isArray(record) ? record[1] : record?.metadata;
        if (!meta || typeof meta !== 'object') {
            continue;
        }
        const decoratorName = (Array.isArray(record) ? record[0] : record?.decor)?.decorator;
        if (decoratorName === '@Module') {
            applyModuleMetadata(def, meta);
            continue;
        }
        if (typeof meta.abstract === 'boolean') {
            def.abstract = meta.abstract;
        }
        if (meta.selector !== undefined) {
            def.selector = meta.selector;
        }
        if (typeof meta.pure === 'boolean') {
            def.pure = meta.pure;
        }
        if (typeof meta.singleton === 'boolean') {
            def.singleton = meta.singleton;
        }
        if (typeof meta.static === 'boolean') {
            def.static = meta.static;
        }
        if (meta.expires) {
            def.expires = meta.expires;
        }
        if (meta.providedIn) {
            def.providedIn = meta.providedIn;
        }
        if (meta.provide !== undefined) {
            (def.provides || (def.provides = []));
            if (def.provides.indexOf(meta.provide) < 0) {
                def.provides.push(meta.provide);
            }
        }
        if (Array.isArray(meta.providers) && meta.providers.length) {
            (def.providers || (def.providers = []));
            if (def.providers !== meta.providers && def.providers.indexOf(meta.providers) < 0) {
                def.providers.push(meta.providers);
            }
        }
    }
}

export function getPrecompiledTypeDefines(target: Function): PrecompiledTypeDecoratorEntry[] | undefined {
    return (target as any)?.[PRECOMPILED_TYPE_DEFINES];
}
