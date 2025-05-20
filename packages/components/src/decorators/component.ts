import { ModuleType, createDecorator, AnnotationType, noPointcut, getModuleType, TypeDef, ActionTypes } from '@tsdi/ioc';
import { ComponentFactory } from '../refs/component';

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
    actionType: ActionTypes.declaration,
    def: {
        class: (ctx) => {
            (ctx.class.type as AnnotationType)[noPointcut] = true;
            const def = ctx.class.getAnnotation<ComponentDef>();
            const metadata = ctx.define.metadata;
            Object.assign(def, metadata);
            def.providers = metadata.providers;
            if (metadata.imports) def.imports = getModuleType(metadata.imports);
        }
    },
    factory: (injector) => {
        return injector.get(ComponentFactory)
    }
})

