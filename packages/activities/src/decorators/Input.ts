import { createPropDecorator, PropertyMetadata, Token, isString, Registration, ClassType } from '@tsdi/ioc';

export interface InputPropertyMetadata extends PropertyMetadata {
    bindingName?: string;
}

/**
 * Input decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPutPropertyDecorator {
    /**
     * define Input property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;
    /**
     * define Input property decorator with provider.
     *
     * @param {ClassType<any> | Registration<any>} provider define provider to resolve value to the property.
     */
    (provider: ClassType<any> | Registration<any>): PropertyDecorator;
    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token<any>} provider define provider to resolve value to the property.
     */
    (bindingName: string, provider: Token<any>): PropertyDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol): void;
}

export const Input: IPutPropertyDecorator = createPropDecorator<InputPropertyMetadata>('Input', args => {
    args.next<InputPropertyMetadata>({
        match: (arg) => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.bindingName = arg;
        }
    });
});
