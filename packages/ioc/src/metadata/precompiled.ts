import { AbstractType } from '../types';
import { DecoratorType, Decors } from './define';

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

const COMPACT_KINDS: PrecompiledDecoratorKind[] = [Decors.CLASS, Decors.property, Decors.method, Decors.parameter];
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
