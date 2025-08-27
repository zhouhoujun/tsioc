import { PropertyMetadata, createPropDecorator } from '@tsdi/ioc';



export interface AttributeMetadata extends PropertyMetadata {
    alias?: string;
    required?: boolean;
}

export interface Attribute {
    (alias?: string, required?: boolean): PropertyDecorator;
    (options?: {
        alias?: string;
        required?: boolean;
    }): PropertyDecorator;
}

export const Attribute: Attribute = createPropDecorator<AttributeMetadata>('Attribute', {
    props: (alias?: string,
        required?: boolean
    ) => {
        return {
            alias,
            required
        };
    },
})

