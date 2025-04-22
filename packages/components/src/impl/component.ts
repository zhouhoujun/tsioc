import { Class, DefaultReflectiveRef, hasOwn, Injector, InvokeArguments, isObject } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentRef } from '../refs/component';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';
import { ViewRef } from '../refs/view';

export class ComponentRefImpl<T> extends DefaultReflectiveRef<T> implements ComponentRef<T> {

    constructor(
        _class: Class<T>,
        injector: Injector,
        readonly compiler: TemplateCompiler,
        options?: InvokeArguments<any>) {
        super(_class, injector, options);
        this.compiler = this.getContext().get(TemplateCompiler);
    }
    
    get hostView(): ViewRef {
        throw new Error('Method not implemented.');
    }
    
    get instance(): T {
        return this.getInstance()
    }


    async render(): Promise<void> {
        const def = this.class.getAnnotation<ComponentDef>();
        const template = def.template || await fetchTemplate(def.templateUrl!);
        this.compiler.compile(template, this);
    }

    protected override createInstance(): T {
        const instance = super.createInstance();
        return reactive(instance, this.injector.get(ReactiveEffect))
    }

}



async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}



export const isReactive = Symbol('__reactive');

function reactive(target: any, effect: ReactiveEffect) {
    // 如果target已经是响应式的，直接返回
    if (target && target[isReactive]) {
        return target
    }

    // 创建代理
    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            // track: 收集依赖
            effect.track(target, key)

            // Reflect.get保证this指向正确
            const res = Reflect.get(target, key, receiver)

            // Vue3会对嵌套对象也进行响应式处理（懒代理）
            if (isObject(res)) {
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
        }

        // ...其他代理方法如has、ownKeys等
    })

    proxy[isReactive] = true

    return proxy;
}
