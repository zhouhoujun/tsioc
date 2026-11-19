import { getClassRef, hasOwn, isFunction, isObject } from '@tsdi/ioc';
import { noReact, ReactiveEffect } from './effect';
import { ComputedMetadata } from './decorators/computed';
import { NoReactive } from './decorators/reactive-operation';
// import { RNode } from './renderer/Node';

const REACT_FlAG = Symbol('__REACT');
const SUBSCRIBABLE_NOTIFY = Symbol('__SUBSCRIBABLE_NOTIFY');

interface ComputedDependency {
    target: object;
    key: string | symbol;
    // Raw value captured on read. Comparing this on each access avoids a
    // second dependency index/cache; only the computed result itself is cached.
    value: any;
}

interface ComputedCacheEntry {
    value: any;
    hasValue: boolean;
    deps: ComputedDependency[];
    evaluating: boolean;
}

interface ComputedCollector {
    // target -> key -> raw value at first read
    deps: Map<object, Map<string | symbol, any>>;
}

// Computed results are cached per proxy (one proxy per effect), so two
// applications can never read each other's cached value.
const computedCache = new WeakMap<object, Map<string | symbol, ComputedCacheEntry>>();
const computedCollectors: ComputedCollector[] = [];
const compiledComputeCache = new Map<string, Function>();
const subscribableEffects = new WeakMap<object, WeakMap<ReactiveEffect, () => void>>();
// 同一 raw 对象按 effect 复用代理，保证 track/trigger 落在正确的 effect 上。
const proxyCache = new WeakMap<object, WeakMap<ReactiveEffect, any>>();
// 最近一次创建的代理，供无 effect 上下文的事件 owner 解析使用。
const primaryProxyCache = new WeakMap<object, any>();
// 反查代理的原始对象：v-for 比较列表项、事件 owner 解析等需要判断
// “同一个 raw 对象的不同 effect 代理”是否指向同一项。
const proxyTargets = new WeakMap<object, object>();
// 同一 raw 对象可能被多个 effect 代理（多 Application / 进程内重启）。
// 写入必须通知所有仍活跃的 effect，否则第二个宿主收不到更新。
const targetEffects = new WeakMap<object, Set<ReactiveEffect>>();

// // 检查是否为Node节点
// function isNode(target: any): target is RNode {
//     return target && typeof target === 'object' &&
//         ('nodeType' in target || 'parentNode' in target || 'childNodes' in target);
// }

function hasReactiveFlag(target: any): boolean {
    return isObject(target)
        && Object.prototype.hasOwnProperty.call(target, REACT_FlAG)
        && !!target[REACT_FlAG];
}

export function getReactiveProxy<T = any>(target: any, effect?: ReactiveEffect): T | undefined {
    if (effect) {
        const cached = proxyCache.get(target)?.get(effect);
        if (cached) {
            return cached;
        }
    }
    return primaryProxyCache.get(target);
}

export function isReactive(target: any): boolean {
    return hasReactiveFlag(target);
}

/** Map a reactive proxy back to the raw object it wraps (identity helper). */
export function unwrapReactive<T = any>(target: any): T {
    if (!target || typeof target !== 'object') {
        return target;
    }
    return (proxyTargets.get(target) as T) ?? target;
}

function canProxy(target: any): boolean {
    return !!target && isObject(target) && !target[noReact] && !isNative(target);
}

export function canReactive(target: any) {
    // 如果target已经是响应式的，直接返回
    if (!canProxy(target)) {
        return false
    }
    if (hasReactiveFlag(target)) {
        return false
    }
    // if (isNode(target)) return false;
    return true;
}


function isNative(target: any) {
    if (Array.isArray(target)) {
        return false;
    }
    const proto = Object.getPrototypeOf(target);
    if (proto === Object.prototype || proto === null) {
        return false;
    }
    // Promise must stay raw: proxying it breaks .then/.catch (internal slots
    // are only readable on the real promise) and pollutes it with REACT_FlAG.
    return target instanceof Date
        || target instanceof Map
        || target instanceof Set
        || target instanceof WeakMap
        || target instanceof WeakSet
        || target instanceof Promise
}

function isSubscribable(target: any): target is { subscribe(listener: () => void): () => void } {
    return !!target && isFunction(target.subscribe);
}

function bindSubscribableEffect(target: object, effect: ReactiveEffect): void {
    if (!isSubscribable(target)) {
        return;
    }
    let effects = subscribableEffects.get(target);
    if (!effects) {
        effects = new WeakMap();
        subscribableEffects.set(target, effects);
    }
    if (effects.has(effect)) {
        return;
    }
    effects.set(effect, target.subscribe(() => {
        effect.trigger(target, SUBSCRIBABLE_NOTIFY);
    }));
}

export function reactive(target: any, effect: ReactiveEffect, computeds?: ComputedMetadata[]) {
    // 同一 raw 目标按 effect 复用 proxy；不同 effect 不复用，避免旧会话的
    // 代理被新会话命中后永远不触发。
    const cached = proxyCache.get(target)?.get(effect);
    if (cached) {
        return cached;
    }

    // 直接返回，不进行代理
    if (!canProxy(target)) {
        return target;
    }

    const classRef = getClassRef(target?.constructor);
    const annotation: any = classRef?.getAnnotation();
    if (annotation?.noReactiveClass === true) {
        return target;
    }
    const noReactiveDefines = classRef?.getDefines(NoReactive) ?? [];
    let noReactiveSet: Set<string | symbol> | undefined;
    const precompiledKeys = annotation?.noReactive as Array<string | symbol> | undefined;
    if (precompiledKeys?.length) {
        noReactiveSet = new Set<string | symbol>(precompiledKeys);
    } else if (noReactiveDefines.length) {
        const memberKeys = noReactiveDefines
            .map(define => define.propertyKey)
            .filter(Boolean) as Array<string | symbol>;
        if (!memberKeys.length) {
            return target;
        }
        noReactiveSet = new Set<string | symbol>(memberKeys);
    }


    // 创建代理
    const computedByKey = computeds?.length
        ? new Map<string | symbol, ComputedMetadata>(
            computeds
                .filter(computed => computed.propertyKey !== undefined)
                .map(computed => [computed.propertyKey, computed])
        )
        : undefined;
    const subscribable = isSubscribable(target);
    let proxy: any;
    proxy = new Proxy(target, {
        get(target, key, receiver) {
            const isNoReactive = key !== REACT_FlAG && noReactiveSet !== undefined && noReactiveSet.has(key);
            if (!isNoReactive && key !== REACT_FlAG && subscribable) {
                bindSubscribableEffect(target, effect);
                effect.track(target, SUBSCRIBABLE_NOTIFY);
            }

            // Computed keys must be resolved before Reflect.get: reading the
            // getter through the proxy receiver first would run it twice.
            const computedDep = key !== REACT_FlAG && !isNoReactive
                ? computedByKey?.get(key)
                : undefined;
            if (computedDep) {
                return getComputedValue(target, proxy, computedDep, effect);
            }

            // Track ordinary reads. Methods are tracked as well (existing
            // behaviour/tests rely on it); reads they perform later through
            // their proxy `this` are tracked on those keys.
            let res = Reflect.get(target, key, receiver);
            if (!isNoReactive && key !== REACT_FlAG) {
                effect.track(target, key);
                // Record the raw value (before nested proxying) so a computed
                // can later validate the dependency without a version index.
                if (!isFunction(res) && computedCollectors.length) {
                    recordComputedDependency(target, key, res);
                }
            }
            if (isFunction(res)) {
                if (isNative(target)) {
                    res = res.bind(target);
                }
            } else if (res && typeof res === 'object') {
                const effectProxies = proxyCache.get(res);
                const cachedNested = effectProxies?.get(effect);
                if (cachedNested) {
                    return cachedNested;
                }
                if (effectProxies) {
                    // Raw target already proxied for another effect: create
                    // this effect's own proxy instead of reusing the stale one.
                    return reactive(res, effect);
                }
                if (!isReactive(res) && canProxy(res)) {
                    return reactive(res, effect);
                }
            }

            return res;
        },

        set(target, key, value, receiver) {
            if (key === REACT_FlAG) {
                return true;
            }

            const oldValue = target[key];

            // Reflect.set保证this指向正确
            const result = Reflect.set(target, key, value, receiver);

            // trigger: value发生变化时触发更新
            if (oldValue !== value) {
                triggerEffects(target, key);
            }

            return result;
        },

        deleteProperty(target: any, key: string | symbol) {
            const hadKey = hasOwn(target, key);
            const result = Reflect.deleteProperty(target, key);

            if (hadKey && result) {
                triggerEffects(target, key);
            }

            return result;
        }
    });

    if (!hasReactiveFlag(target)) {
        try {
            Object.defineProperty(target, REACT_FlAG, {
                value: true,
                writable: true,
                configurable: false,
                enumerable: false
            });
        } catch {
            // Frozen/sealed targets cannot carry the marker; keep the proxy
            // usable for reads instead of throwing on creation.
        }
    }
    let effectProxies = proxyCache.get(target);
    if (!effectProxies) {
        effectProxies = new WeakMap();
        proxyCache.set(target, effectProxies);
    }
    effectProxies.set(effect, proxy);
    primaryProxyCache.set(target, proxy);
    proxyTargets.set(proxy, target);

    let effects = targetEffects.get(target);
    if (!effects) {
        effects = new Set<ReactiveEffect>();
        targetEffects.set(target, effects);
    }
    effects.add(effect);

    return proxy;
}

function triggerEffects(target: object, key: string | symbol): void {
    const effects = targetEffects.get(target);
    if (!effects) {
        return;
    }
    for (const effect of effects) {
        if (!effect.active) {
            effects.delete(effect);
            continue;
        }
        effect.trigger(target, key);
    }
}

/**
 * Record a property read that happened while a computed property was being
 * evaluated. Nested proxy reads land here too, which is what makes
 * `get label() { return this.user.name }` invalidate on `user.name = ...`.
 */
function recordComputedDependency(target: object, key: string | symbol, value: any, collector?: ComputedCollector): void {
    const active = collector ?? computedCollectors[computedCollectors.length - 1];
    if (!active) {
        return;
    }
    let keys = active.deps.get(target);
    if (!keys) {
        keys = new Map<string | symbol, any>();
        active.deps.set(target, keys);
    }
    if (!keys.has(key)) {
        keys.set(key, value);
    }
}

function depsAreCurrent(deps: ComputedDependency[]): boolean {
    for (const dep of deps) {
        if (Reflect.get(dep.target, dep.key) !== dep.value) {
            return false;
        }
    }
    return true;
}

/**
 * Flatten the collector, dropping keys the computed wrote itself. A
 * side-effectful getter must not make its own output look stale forever.
 */
function flattenDependencies(collector: ComputedCollector): ComputedDependency[] {
    const deps: ComputedDependency[] = [];
    collector.deps.forEach((keys, target) => {
        keys.forEach((value, key) => {
            if (Reflect.get(target, key) === value) {
                deps.push({ target, key, value });
            }
        });
    });
    return deps;
}

/**
 * A cached computed value must still subscribe the current binding to every
 * dependency it was computed from; otherwise the second binding reading the
 * same computed would never be notified.
 */
function linkComputedDependencies(deps: ComputedDependency[], effect: ReactiveEffect): void {
    const collector = computedCollectors[computedCollectors.length - 1];
    for (const dep of deps) {
        effect.track(dep.target, dep.key);
        if (collector) {
            recordComputedDependency(dep.target, dep.key, dep.value);
        }
    }
}

function computeValue(target: any, proxy: any, computed: ComputedMetadata): any {
    if (computed.compute) {
        if (typeof computed.compute === 'function') {
            return computed.compute.call(proxy, proxy);
        }
        let body = compiledComputeCache.get(computed.compute);
        if (!body) {
            body = new Function('ctx', `with(ctx){return ${computed.compute}}`);
            compiledComputeCache.set(computed.compute, body);
        }
        return body(proxy);
    }
    // Getter form: run with the proxy as receiver so nested reads are tracked.
    return Reflect.get(target, computed.propertyKey, proxy);
}

// 处理计算属性访问
function getComputedValue(target: any, proxy: any, computed: ComputedMetadata, effect: ReactiveEffect): any {
    let targetCache = computedCache.get(proxy);
    if (!targetCache) {
        targetCache = new Map();
        computedCache.set(proxy, targetCache);
    }

    const key = computed.propertyKey;
    const cacheable = computed.cache !== false;
    let entry = targetCache.get(key);

    if (entry?.evaluating) {
        // Circular computed reference: return the previous value instead of
        // recursing until the stack overflows.
        return entry.hasValue ? entry.value : undefined;
    }

    if (entry && entry.hasValue && cacheable && depsAreCurrent(entry.deps)) {
        linkComputedDependencies(entry.deps, effect);
        return entry.value;
    }

    if (!entry) {
        entry = { value: undefined, hasValue: false, deps: [], evaluating: false };
        targetCache.set(key, entry);
    }

    const collector: ComputedCollector = { deps: new Map() };
    const parentCollector = computedCollectors[computedCollectors.length - 1];
    computedCollectors.push(collector);
    entry.evaluating = true;
    try {
        const result = computeValue(target, proxy, computed);
        entry.value = canReactive(result) || proxyCache.has(result) || primaryProxyCache.has(result)
            ? reactive(result, effect)
            : result;
        entry.hasValue = true;
        entry.deps = flattenDependencies(collector);
        if (parentCollector) {
            // Nested computed: the outer computed must invalidate when any of
            // this computed's inputs change, even though it only read the
            // computed property itself.
            for (const dep of entry.deps) {
                recordComputedDependency(dep.target, dep.key, dep.value, parentCollector);
            }
        }
        return entry.value;
    } catch (error) {
        // Never keep a previous value as if the failed computation succeeded.
        entry.hasValue = false;
        entry.deps = [];
        throw error;
    } finally {
        computedCollectors.pop();
        entry.evaluating = false;
    }
}
