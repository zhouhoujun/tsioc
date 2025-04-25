import { ModuleType, createDecorator, AnnotationType, noPointcut, getModuleType, TypeDef, ActionTypes } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponenFactory } from '../refs/component';
import { RunnableFactory } from '@tsdi/core';
import { ComponentRunnableFactory } from '../refs/runnable';

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
    actionType: ActionTypes.annoation,
    def: {
        class: (ctx) => {
            (ctx.class.type as AnnotationType)[noPointcut] = true;
            const def = ctx.class.getAnnotation<ComponentDef>();
            const metadata = ctx.define.metadata;
            def.providers = metadata.providers;
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
        }
    },
    // design: {
    //     class: (ctx) => {
    //         const effect = ctx.injector.get(ReactiveEffect);
    //         const factory = ctx.injector.get(ComponenFactory);
    //         // ctx.isNewContext = false;

    //     }
    // },
    providers: [
        { provide: RunnableFactory, useExisting: ComponentRunnableFactory }
    ]
})

