import { MethodPropDecorator, PropertyMetadata, createDecorator } from '@tsdi/ioc';



export interface AttributeMetadata<T = any> extends PropertyMetadata<T> {
    alias?: string;
    required?: boolean;
}

export interface Attribute {
    (alias?: string, required?: boolean): MethodPropDecorator;
    (options?: Omit<AttributeMetadata, 'propertyKey'|'mutil'>): MethodPropDecorator;
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

