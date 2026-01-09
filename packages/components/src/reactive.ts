import { hasOwn, isFunction, isObject } from '@tsdi/ioc';
import { ReactiveEffect } from './ReactiveEffect';
import { ComputedMetadata } from './decorators/computed';
// import { RNode } from './renderer/Node';

export const isReactive = Symbol('__reactive');
export const computedSymbol = Symbol('__computed');
export const noReact = Symbol('__noneProxy');

// 计算属性缓存和依赖追踪
const computedCache = new WeakMap<any, Map<string | symbol, { value: any, deps: Set<string | symbol> }>>();

// // 检查是否为Node节点
// function isNode(target: any): target is RNode {
//     return target && typeof target === 'object' &&
//         ('nodeType' in target || 'parentNode' in target || 'childNodes' in target);
// }

export function canReactive(target: any) {
    // 如果target已经是响应式的，直接返回
    if (!target || !isObject(target) || target[isReactive] || target[noReact]) {
        return false
    }
    // if (isNode(target)) return false;

    return true;
}


// 检查当前是否在计算属性求值过程中
let isComputing = false;
let currentComputedKey: string | symbol | null = null;

const native$ = /\[native code\]/;
function isNative(target: any) {
    // return !!target && native$.test(getType(target)?.toString()??'')
    return target instanceof Date
        || target instanceof Map
        || target instanceof Set
        || target instanceof WeakMap
        || target instanceof WeakSet
}

export function reactive(target: any, effect: ReactiveEffect, computeds?: ComputedMetadata[]) {
    // 直接返回，不进行代理
    if (!canReactive(target)) {
        return target;
    }

    // 创建代理
    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            // 如果是计算属性求值过程，只追踪依赖属性的访问
            if (isComputing && currentComputedKey) {
                const computedDep = computeds?.find(c => c.propertyKey === currentComputedKey);
                if (computedDep?.dependencies?.includes(key as string)) {
                    // 只对依赖属性进行追踪
                    effect.track(target, key);
                }
            } else {
                // 正常情况下的依赖追踪
                effect.track(target, key);
            }

            // Reflect.get保证this指向正确
            let res = Reflect.get(target, key, receiver);
            const computedDep = computeds?.find(c => c.propertyKey === key);
            // 处理计算属性
            if (computedDep) {
                return handleComputedProperty(target, computedDep, effect);
            }

            if (isFunction(res)) {
                if (isNative(target)) {
                    res = res.bind(target);
                }
            } else if (canReactive(res)) {
                return reactive(res, effect);
            }

            return res;
        },

        set(target, key, value, receiver) {
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
        },

        // ...其他代理方法如has、ownKeys等
        ownKeys(target) {
            return Reflect.ownKeys(target);
        },
        has(target, key) {
            return key in target || Reflect.has(target, key);
        }
    });

    proxy[isReactive] = true;

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