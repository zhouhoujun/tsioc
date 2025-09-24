import { createDecorator, AnnotationType, noPointcut, getModuleType, ActionType, tokenId, InvocationContext } from '@tsdi/ioc';
import { ComponentFactory, ComponentOptions, ComponentRef } from '../refs/component';
import { Attribute, AttributeMetadata } from './atteribute';
import { DIRECTIVES } from './directive';
// import { State, StateMetadata } from './state';
import { ComponentDef } from '../refs/component';
import { Factoriable, factoryKey } from '../refs/directive';
import { NodeType } from '../renderer/Node';



export const COMPONENTS = tokenId<ComponentDef[]>('COMPONENTS');

export type ComponentDecorator = (options: Partial<ComponentDef>) => ClassDecorator;


export const Component: ComponentDecorator = createDecorator<Partial<ComponentDef>>('Component', {
    actionType: ActionType.declaration | ActionType.component,
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            (typeRef.type as AnnotationType)[noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation<ComponentDef>() as ComponentDef;
            def.nodeType = NodeType.Container;
            if (!def.selector) def.selector = typeRef.className;
            const metadata = ctx.define.metadata;
            if (metadata.providers) {
                def.providers?.push(...metadata.providers);
            }
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
            // def.states = typeRef.getDefines(State).map(d => d as StateMetadata);
            def.attributes = typeRef.getDefines(Attribute).map(d => d as AttributeMetadata);
        }
    },
    design: {
        afterAnnoation: (ctx) => {
            const typeRef = ctx.classRef;
            const injector = ctx.injector;
            const def = typeRef.getAnnotation<ComponentDef>() as ComponentDef & Factoriable;
            if (!def.selector) def.selector = typeRef.className;
            const selectors = def.selector.split(',');

            if (!def[factoryKey]) {
                def[factoryKey] = (ctx: InvocationContext, options: ComponentOptions) => {
                    return typeRef.createInvocation(ctx.injector, options) as ComponentRef<any>
                }
            }
            if (selectors.some(r => dir$.test(r))) {
                ctx.injector.inject({ provide: DIRECTIVES, useValue: def, multi: true });
            }
            if (selectors.some(r => !dir$.test(r))) {
                ctx.injector.inject({ provide: COMPONENTS, useValue: def, multi: true });
            }
        }
    },
    factory: (injector) => {
        return injector.get(ComponentFactory)
    }
})

const dir$ = /\[\w+\]/;