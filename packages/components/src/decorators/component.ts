import { ModuleType, createDecorator, AnnotationType, noPointcut, getModuleType, TypeDef, ActionTypes, InvocationContext } from '@tsdi/ioc';
import { ComponentFactory } from '../refs/component';
import { Attribute, AttributeMetadata } from './atteribute';
import { SchemaMetadata } from '../template/schema';
import { COMPONENTS, DIRECTIVES } from '../template/compiler';

export interface ComponentDef<T = any> extends TypeDef<T> {
    imports?: ModuleType[],
    selector?: string;
    template?: string;
    templateUrl?: string;
    styles?: string[];
    styleUrls?: string[];
    providers?: any[];
    attributes?: AttributeMetadata[];
    schemas?: SchemaMetadata[];
}


export type ComponentDecorator = (options: Partial<ComponentDef>) => ClassDecorator;


export const Component: ComponentDecorator = createDecorator<Partial<ComponentDef>>('Component', {
    actionType: ActionTypes.declaration,
    def: {
        class: (ctx) => {
            const typeRef = ctx.class;
            (typeRef.type as AnnotationType)[noPointcut] = true;
            typeRef.setAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation<ComponentDef>();
            if (!def.selector) def.selector = typeRef.className;
            const metadata = ctx.define.metadata;
            def.providers = metadata.providers;
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
            def.attributes = typeRef.getDefines(Attribute).map(d => d as AttributeMetadata);
        }
    },
    design: {
        afterAnnoation: (ctx) => {
            const typeRef = ctx.class;
            const def = typeRef.getAnnotation<ComponentDef>();
            if (!def.selector) return;
            const selectors = def.selector.split(',');
            const factory = ctx.injector.get(ComponentFactory);
            // for (let sel of selectors) {
            //     sel = sel.trim();
            //     const func = (parent: InvocationContext) => factory.create(typeRef, { parent });
            //     func['name'] = sel;
            //     if (sel.indexOf('[') > -1) {
            //         ctx.injector.inject({ provide: DIRECTIVES, useValue: func, multi: true });
            //     } else {
            //         ctx.injector.inject({ provide: COMPONENTS, useValue: func, multi: true });
            //     }
            // }
        }
    },
    factory: (injector) => {
        return injector.get(ComponentFactory)
    }
})

