import { Module, Injectable, Inject, ModuleType, createDecorator, AnnotationType, noPointcut, isObject, hasOwn, getModuleType, lang, ClassType, TypeDef } from '@tsdi/ioc';
import { OnChanges, OnInit, AfterViewInit } from '../lifecycle';
import { ReactiveEffect } from '../ReactiveEffect';
import { TemplateCompiler } from '../template/compiler';
import { ComponenFactory, ComponentRef } from '../refs/component';

export interface ComponentDef<T = any> extends TypeDef<T> {
    imports?: ModuleType[],
    selector?: string;
    template?: string;
    templateUrl?: string;
    styles?: string[];
    styleUrls?: string[];
    providers?: any[];
}


export type ComponentDecorator = (options: Partial<ComponentDef>) => ClassDecorator;

const componentDefs = new WeakMap<any, ComponentRef<any>>();


export const Component: ComponentDecorator = createDecorator<Partial<ComponentDef>>('Component', {
    def: {
        class: (ctx) => {
            (ctx.class.type as AnnotationType)[noPointcut] = true;
            const def = ctx.class.getAnnotation<ComponentDef>();
            const metadata = ctx.define.metadata;
            def.providedIn = metadata.providedIn;
            def.providers = metadata.providers;
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
        }
    },
    design: {
        class: (ctx) => {
            const effect = ctx.injector.get(ReactiveEffect);
            const factory = ctx.injector.get(ComponenFactory);
            // ctx.isNewContext = false;
            const componentRef = factory.create(ctx.class);
            
        }
    },
    runtime: {
        class: (ctx) => {
            const effect = ctx.injector.get(ReactiveEffect);
            ctx.instance = reactive(ctx.instance, effect);
            const factory = ctx.injector.get(ComponenFactory);
            ctx.isNewContext = false;
            const componentRef = factory.create(ctx.class, {parent: ctx.context});
            componentDefs.set(ctx.instance, componentRef);

            
            // // 添加模板编译支持
            // const def = ctx.class.getAnnotation<ComponentDef>();
            // if (def.template || def.templateUrl) {
            //     const effect = ctx.injector.get(ReactiveEffect);
            //     const compiler = new TemplateCompiler(effect, def.compilerOptions);
            //     const template = def.template || fetchTemplate(def.templateUrl!);
            //     target.render = () => compiler.compile(template, target);
            // }
            return (ctx.instance as OnInit).onInit?.();
            
        }
    }
})


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
