import { getType, hasOwn, isFunction, isObject } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';

export const isReactive = Symbol('__reactive');


// const native$ = /\[native code\]/;
function isNative(target: any) {
    // return !!target && native$.test(getType(target)?.toString()??'')
    return target instanceof Date
    || target instanceof Map
    || target instanceof Set
    || target instanceof WeakMap
    || target instanceof WeakSet
}

export function reactive(target: any, effect: ReactiveEffect) {
    // 如果target已经是响应式的，直接返回
    if (!target || !isObject(target) || target[isReactive]) {
        return target
    }

    // 创建代理
    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            // track: 收集依赖
            effect.track(target, key)

            // Reflect.get保证this指向正确
            let res = Reflect.get(target, key, receiver);

            if (isFunction(res)) {
                if (isNative(target)) {
                    res = res.bind(target);
                }
            } else if (isObject(res) && !res[isReactive]) {

                // 嵌套对象也进行响应式处理（懒代理）
                return reactive(res, effect)
            }

            return res
        },

        set(target, key, value, receiver) {
            const oldValue = target[key]

            // Reflect.set保证this指向正确
            const result = Reflect.set(target, key, value, receiver)

            // trigger: value发生变化时触发更新
            if (oldValue !== value) {
                effect.trigger(target, key)
            }

            return result
        },

        deleteProperty(target: any, key: string | symbol) {
            const hadKey = hasOwn(target, key)
            const result = Reflect.deleteProperty(target, key)

            if (hadKey && result) {
                effect.trigger(target, key)
            }

            return result
        },

        // ...其他代理方法如has、ownKeys等
        ownKeys(target) {
            return Reflect.ownKeys(target);
        },
        has(target, key) {
            return key in target || Reflect.has(target, key);
        }
    })

    proxy[isReactive] = true

    return proxy;
}
