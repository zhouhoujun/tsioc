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
    // runtime: {
    //     class: (ctx) => {
    //         const effect = ctx.injector.get(ReactiveEffect);
    //         ctx.instance = reactive(ctx.instance, effect);
    //         const factory = ctx.injector.get(ComponenFactory);
    //         ctx.isNewContext = false;
    //         const componentRef = factory.create(ctx.class, {parent: ctx.context});
    //         componentDefs.set(ctx.instance, componentRef);

            
    //         // // 添加模板编译支持
    //         // const def = ctx.class.getAnnotation<ComponentDef>();
    //         // if (def.template || def.templateUrl) {
    //         //     const effect = ctx.injector.get(ReactiveEffect);
    //         //     const compiler = new TemplateCompiler(effect, def.compilerOptions);
    //         //     const template = def.template || fetchTemplate(def.templateUrl!);
    //         //     target.render = () => compiler.compile(template, target);
    //         // }
    //         return (ctx.instance as OnInit).onInit?.();
            
    //     }
    // }
})

