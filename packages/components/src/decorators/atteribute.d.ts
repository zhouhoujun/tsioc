import { MethodPropDecorator, PropertyMetadata } from '@tsdi/ioc';
export interface AttributeMetadata<T = any> extends PropertyMetadata<T> {
    alias?: string;
    required?: boolean;
}
export interface Attribute {
    (alias?: string, required?: boolean): MethodPropDecorator;
    (options?: Omit<AttributeMetadata, 'propertyKey' | 'mutil'>): MethodPropDecorator;
}
export declare const Attribute: Attribute;
