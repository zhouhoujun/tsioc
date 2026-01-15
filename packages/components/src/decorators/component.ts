import { createDecorator, AnnotationType, noPointcut, getModuleType, ActionType, token, InvocationContext } from '@tsdi/ioc';
import { ComponentFactory, ComponentOptions, ComponentRef } from '../refs/component';
import { Attribute, AttributeMetadata } from './atteribute';
import { DIRECTIVES } from './directive';
import { ComponentDef } from '../refs/component';
import { DirectiveType, Factoriable, factoryKey } from '../refs/directive';
import { Computed, ComputedMetadata } from './computed';



export const COMPONENTS = token<ComponentDef[]>('COMPONENTS');

export type ComponentDecorator = (options: Partial<ComponentDef>) => ClassDecorator;


export const Component: ComponentDecorator = createDecorator<Partial<ComponentDef>>('Component', {
    actionType: ActionType.declaration | ActionType.component,
    appendProps: (metadata) => {
        metadata.static = false;
    },
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            (typeRef.type as AnnotationType)[noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation<ComponentDef>() as ComponentDef;
            def.dirType = DirectiveType.Component;
            if (!def.selector) def.selector = typeRef.className;
            const metadata = ctx.define.metadata;
            if (metadata.providers) {
                def.providers?.push(...metadata.providers);
            }
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
            // def.states = typeRef.getDefines(State).map(d => d as StateMetadata);
            def.attributes = typeRef.getDefines(Attribute).map(d => d.metadata as AttributeMetadata);
            def.computeds = typeRef.getDefines(Computed).map(d => d.metadata as ComputedMetadata);
        }
    },
    design: {
        afterAnnoation: (typeRef, ctx) => {
            const def = typeRef.getAnnotation<ComponentDef>() as ComponentDef & Factoriable;
            if (!def.selector) def.selector = typeRef.className;

            if (!def[factoryKey]) {
                def[factoryKey] = (ctx: InvocationContext, options: ComponentOptions) => {
                    return typeRef.createInvocation(ctx, options) as ComponentRef<any>
                }
            }

            if (dir$.test(def.selector)) {
                const selectors = def.selector.split(',');
                const dirSelector = selectors.filter(r => dir$.test(r)).join(',');
                const compSelector = selectors.filter(r => !dir$.test(r)).join(',');
                if (dirSelector) {
                    ctx.injector.getInject().inject({ provide: DIRECTIVES, useValue: { ...def, selector: dirSelector }, multi: true });
                }
                if (compSelector) {
                    ctx.injector.getInject().inject({ provide: COMPONENTS, useValue: { ...def, selector: compSelector }, multi: true });
                }
            } else {
                ctx.injector.getInject().inject({ provide: COMPONENTS, useValue: def, multi: true });
            }
        }
    },
    factory: (injector) => {
        return injector.get(ComponentFactory)
    }
})

const dir$ = /\[\w+\]/;