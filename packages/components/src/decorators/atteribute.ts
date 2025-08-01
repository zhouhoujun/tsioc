import { PropertyMetadata, createPropDecorator } from '@tsdi/ioc';



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

