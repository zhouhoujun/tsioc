import { ModuleType, createDecorator, AnnotationType, noPointcut, getModuleType, TypeDef, ActionTypes } from '@tsdi/ioc';
import { ComponentFactory } from '../refs/component';
import { Attribute, AttributeMetadata } from './atteribute';
import { SchemaMetadata } from '../template/schema';

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
            const metadata = ctx.define.metadata;
            def.providers = metadata.providers;
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
            def.attributes = typeRef.getDefines(Attribute).map(d => d as AttributeMetadata);
        }
    },
    factory: (injector) => {
        return injector.get(ComponentFactory)
    }
})

