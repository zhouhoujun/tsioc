import { ModuleType, createDecorator, AnnotationType, noPointcut, getModuleType, TypeDef, ActionType } from '@tsdi/ioc';
import { ComponentFactory } from '../refs/component';
import { Attribute, AttributeMetadata } from './atteribute';
import { SchemaMetadata } from '../template/schema';
import { COMPONENTS, DIRECTIVES } from '../template/compiler';
// import { State, StateMetadata } from './state';

export interface ComponentDef<T = any> extends TypeDef<T> {
    imports?: ModuleType[],
    selector?: string;
    template?: any;
    templateUrl?: string;
    styles?: string[];
    styleUrls?: string[];
    providers?: any[];
    // states?: StateMetadata[];
    attributes?: AttributeMetadata[];
    schemas?: SchemaMetadata[];
}


export type ComponentDecorator = (options: Partial<ComponentDef>) => ClassDecorator;


export const Component: ComponentDecorator = createDecorator<Partial<ComponentDef>>('Component', {
    actionType: ActionType.declaration,
    def: {
        class: (ctx) => {
            const typeRef = ctx.classRef;
            (typeRef.type as AnnotationType)[noPointcut] = true;
            typeRef.assignAnnotation(ctx.define.metadata);
            const def = typeRef.getAnnotation<ComponentDef>() as ComponentDef;
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
    factory: (injector) => {
        return injector.get(ComponentFactory)
    }
})

