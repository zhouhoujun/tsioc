import { hasOwn, isFunction, isObject } from '@tsdi/ioc';
import { noReact, ReactiveEffect } from './effect';
import { ComputedMetadata } from './decorators/computed';
import { isNoReactiveProperty } from './decorators/reactive-operation';
// import { RNode } from './renderer/Node';

const REACT_FlAG = Symbol('__REACT');
const SUBSCRIBABLE_NOTIFY = Symbol('__SUBSCRIBABLE_NOTIFY');

// 计算属性缓存和依赖追踪
const computedCache = new WeakMap<any, Map<string | symbol, { value: any, deps: Set<string | symbol> }>>();
const subscribableEffects = new WeakMap<object, WeakMap<ReactiveEffect, () => void>>();
const proxyCache = new WeakMap<object, any>();

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

export function isReactive(target: any): boolean {
    return hasReactiveFlag(target);
}

export function canReactive(target: any) {
    // 如果target已经是响应式的，直接返回
    if (!target || !isObject(target) || target[noReact]) {
        return false
    }
    if (hasReactiveFlag(target)) {
        return false
    }
    // if (isNode(target)) return false;

    if (isNative(target)) {
        return false;
    }

    return true;
}


// 检查当前是否在计算属性求值过程中
let isComputing = false;
let currentComputedKey: string | symbol | null = null;

function isNative(target: any) {
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
    // 同一raw目标复用同一proxy，保证track/trigger落在同一effect的depsMap
    const cached = proxyCache.get(target);
    if (cached) {
        return cached;
    }

    // 直接返回，不进行代理
    if (!canReactive(target)) {
        return target;
    }

    // 创建代理
    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            // Resolve methods before dependency tracking. Reading an operation
            // such as `state.setMessages` must not subscribe a binding to the
            // method property; state reads performed by the method through its
            // proxy `this` remain tracked normally.
            let res = Reflect.get(target, key, receiver);
            const isNoReactive = key !== REACT_FlAG && isNoReactiveProperty(target, key, res);
            if (!isNoReactive && key !== REACT_FlAG && isSubscribable(target)) {
                bindSubscribableEffect(target, effect);
                effect.track(target, SUBSCRIBABLE_NOTIFY);
            }
            if (!isNoReactive && key !== REACT_FlAG) {
                // If the property is a computed getter, its value is tracked
                // below by the computed handler rather than as a function key.
                if (isComputing && currentComputedKey) {
                    const computedDep = computeds?.find(c => c.propertyKey === currentComputedKey);
                    if (computedDep?.dependencies?.includes(key as string)) {
                        effect.track(target, key);
                    }
                } else {
                    effect.track(target, key);
                }
            }
            const computedDep = computeds?.find(c => c.propertyKey === key);
            // 处理计算属性
            if (computedDep) {
                return handleComputedProperty(target, computedDep, effect);
            }

            if (isFunction(res)) {
                if (isNative(target)) {
                    res = res.bind(target);
                }
            } else if (canReactive(res) || proxyCache.has(res)) {
                return reactive(res, effect);
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
                effect.trigger(target, key);

                // 如果修改的是计算属性的依赖属性，清除相关计算属性的缓存
                computeds?.forEach((comp: any) => {
                    if (comp.dependencies?.includes(key as string)) {
                        clearComputedCache(target, comp.propertyKey);
                    }
                });

            }

            return result;
        },

        deleteProperty(target: any, key: string | symbol) {
            const hadKey = hasOwn(target, key);
            const result = Reflect.deleteProperty(target, key);

            if (hadKey && result) {
                effect.trigger(target, key);

                // 如果删除的是计算属性的依赖属性，清除相关计算属性的缓存
                computeds?.forEach((comp: any) => {
                    if (comp.dependencies?.includes(key as string)) {
                        clearComputedCache(target, comp.propertyKey);
                    }
                });

            }

            return result;
        }
    });

    Object.defineProperty(target, REACT_FlAG, {
        value: true,
        writable: true,
        configurable: false,
        enumerable: false
    });
    proxyCache.set(target, proxy);

    return proxy;
}

// 处理计算属性访问
function handleComputedProperty(target: any, computed: ComputedMetadata, effect: ReactiveEffect): any {
    // 初始化缓存
    if (!computedCache.has(target)) {
        computedCache.set(target, new Map());
    }

    const targetCache = computedCache.get(target)!;

    // 检查缓存是否有效
    const cacheEntry = targetCache.get(computed.propertyKey);

    if (cacheEntry && computed?.cache !== false) {
        // 检查依赖是否发生变化
        const depsChanged = Array.from(cacheEntry.deps).some(depKey => {
            const currentValue = Reflect.get(target, depKey);
            // 这里需要更精确的依赖变化检测，暂时使用简单实现
            return currentValue !== cacheEntry.value;
        });

        if (!depsChanged) {
            return cacheEntry.value;
        }
    }

    // 计算新值
    return effect.run(() => {
        isComputing = true;
        currentComputedKey = computed.propertyKey;

        try {
            // 执行计算逻辑
            let value: any;
            if (computed?.compute) {
                if (typeof computed.compute === 'function') {
                    value = computed.compute(target);
                } else {
                    value = new Function('ctx', `with(ctx){return ${computed.compute}}`)(target);
                }
            } else {
                // 使用getter方法
                value = Reflect.get(target, computed.propertyKey);
            }

            // 更新缓存
            if (computed?.cache !== false) {
                const newDeps = new Set<string | symbol>();
                // 这里应该收集实际的依赖，但需要更复杂的实现
                // 暂时使用声明的依赖
                if (computed?.dependencies) {
                    computed.dependencies.forEach((dep: string) => newDeps.add(dep));
                }

                targetCache.set(computed.propertyKey, { value, deps: newDeps });
            }

            return value;
        } finally {
            isComputing = false;
            currentComputedKey = null;
        }
    });
}

// 清除计算属性缓存
function clearComputedCache(target: any, key?: string | symbol) {
    if (!computedCache.has(target)) return;

    const targetCache = computedCache.get(target)!;
    if (key) {
        targetCache.delete(key);
    } else {
        targetCache.clear();
    }
}
