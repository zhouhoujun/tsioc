import { ModuleType, AnnotationType, noPointcut, getModuleType, ActionTypes, PropertyMetadata, createPropDecorator } from '@tsdi/ioc';
import { ComponentFactory } from '../refs/component';


export interface AtteributeMetadata extends PropertyMetadata {
    alias?: string;
    required?: boolean;
}

export interface Atteribute {
    (alias?: string, required?: boolean): PropertyDecorator;
    (options?: {
        alias?: string;
        required?: boolean;
    }): PropertyDecorator;
}

export const Atteribute: Atteribute = createPropDecorator<AtteributeMetadata>('Atteribute', {
    props: (alias?: string,
        required?: boolean
    ) => {
        return {
            alias,
            required
        };
    },
})

