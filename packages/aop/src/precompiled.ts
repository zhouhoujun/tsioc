import { AbstractType, getClassRef, getPrecompiledType, noPointcut } from '@tsdi/ioc';
import { AdviceMetadata, AdviceTypes, AspectMetadata } from './metadata/meta';

export interface PrecompiledAdvice {
    [key: string]: any;
    propertyKey: string;
    adviceName: AdviceTypes;
    pointcut?: string | RegExp;
    annotation?: string;
    accessor?: 'get' | 'set' | 'value';
    target?: string | AbstractType;
    returning?: string;
    throwing?: string;
    args?: string;
    params?: Array<{ type?: string | AbstractType; name?: string; optional?: boolean }>;
}

export interface PrecompiledAspect {
    [key: string]: any;
    within?: Array<string | AbstractType>;
    without?: Array<string | AbstractType>;
    annotation?: string;
    singleton?: boolean;
    advices: PrecompiledAdvice[];
}

export interface PrecompiledAspectEntry {
    target: AbstractType;
    metadata: PrecompiledAspect;
}

const PRECOMPILED_ASPECTS: PrecompiledAspectEntry[] = [];
const listeners = new Set<(target: AbstractType) => void>();

function resolveTypes(value: Array<string | AbstractType> | string | AbstractType | undefined): any {
    if (value === undefined || value === null) {
        return undefined;
    }
    const list = Array.isArray(value) ? value : [value];
    const resolved = list
        .map(item => typeof item === 'string' ? getPrecompiledType(item) : item)
        .filter(Boolean);
    if (!resolved.length) {
        return undefined;
    }
    return resolved.length === 1 ? resolved[0] : resolved;
}

/**
 * Apply a build-time aspect/advice descriptor without `@Aspect`, `@Before`,
 * `@AfterReturning`, ... decorators. The annotation is written directly to the
 * class ref so `Advisor` can register it through the normal runtime path.
 */
export function registerPrecompiledAspect(target: AbstractType, metadata: PrecompiledAspect): void {
    if (!target) {
        return;
    }
    const { advices: adviceList = [], ...aspectOptions } = metadata;
    const within = resolveTypes(aspectOptions.within as any);
    const without = resolveTypes(aspectOptions.without as any);
    const aspect: AspectMetadata = {
        ...aspectOptions,
        within,
        without
    } as AspectMetadata;
    const advices: AdviceMetadata[] = adviceList.map(advice => ({
        ...advice,
        type: target,
        propertyKey: advice.propertyKey,
        adviceName: advice.adviceName,
        pointcut: advice.pointcut as any,
        target: typeof advice.target === 'string' ? getPrecompiledType(advice.target) : advice.target,
        within,
        without
    } as AdviceMetadata));
    const ref = getClassRef(target);
    ref.assignAnnotation({ aspect, advices });
    const annotation: any = ref.getAnnotation();
    adviceList.forEach(advice => {
        if (!advice.params) {
            return;
        }
        const params = advice.params.map(param => ({
            type: typeof param.type === 'string' ? getPrecompiledType(param.type) : param.type,
            name: param.name,
            optional: param.optional
        }));
        const existing = annotation.methodMetadatas?.get(advice.propertyKey) || {};
        annotation.methodMetadatas?.set(advice.propertyKey, { ...existing, params });
    });
    try {
        (target as any)[noPointcut] = true;
    } catch {
        // Classes can be frozen by the host; noPointcut is best-effort.
    }

    if (!PRECOMPILED_ASPECTS.some(item => item.target === target)) {
        const entry = { target, metadata };
        PRECOMPILED_ASPECTS.push(entry);
        listeners.forEach(listener => listener(target));
    }
}

/**
 * Precompiled equivalent of `@NonePointcut()`: mark a class so AOP never
 * advises it, without evaluating the decorator factory.
 */
export function registerPrecompiledNoPointcut(target: AbstractType): void {
    if (!target) {
        return;
    }
    try {
        (target as any)[noPointcut] = true;
    } catch {
        // Classes can be frozen by the host; noPointcut is best-effort.
    }
}

export function getPrecompiledAspects(): PrecompiledAspectEntry[] {
    return PRECOMPILED_ASPECTS.slice();
}

/**
 * AopProvider subscribes so aspects registered after module setup are still
 * added to the active Advisor.
 */
export function onPrecompiledAspect(listener: (target: AbstractType) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function clearPrecompiledAspects(): void {
    PRECOMPILED_ASPECTS.length = 0;
}
