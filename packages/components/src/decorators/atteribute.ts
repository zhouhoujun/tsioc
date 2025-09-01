import { MethodPropDecorator, PropertyMetadata, createDecorator } from '@tsdi/ioc';



export interface AttributeMetadata extends PropertyMetadata {
    alias?: string;
    required?: boolean;
}

export interface Attribute {
    (alias?: string, required?: boolean): MethodPropDecorator;
    (options?: {
        alias?: string;
        required?: boolean;
    }): MethodPropDecorator;
}

export const Attribute: Attribute = createDecorator<AttributeMetadata>('Attribute', {
    props: (alias?: string,
        required?: boolean
    ) => {
        return {
            alias,
            required
        };
    },
})

