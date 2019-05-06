import { Token, isString, PropParamDecorator, createParamPropDecorator, ParamPropMetadata, isToken, isObject } from '@tsdi/ioc';


export interface BindingPropertyMetadata extends ParamPropMetadata {
    bindingName?: string;
    defaultValue?: any;
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
    (bindingName?: string): PropParamDecorator;
    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token<any>} provider define provider to resolve value to the property.
     */
    (bindingName: string, provider: Token<any>): PropParamDecorator;

    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token<any>} provider define provider to resolve value to the property.
     * @param {*} binding default value.
     */
    (bindingName: string, provider: Token<any>, defaultVal: any): PropParamDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}

export const Input: IPutPropertyDecorator = createParamPropDecorator<BindingPropertyMetadata>('Input', args => {
    args.next<BindingPropertyMetadata>({
        match: (arg) => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.bindingName = arg;
        }
    });
    args.next<BindingPropertyMetadata>({
        match: (arg) => isToken(arg),
        setMetadata: (metadata, arg) => {
            metadata.provider = arg;
        }
    });
    args.next<BindingPropertyMetadata>({
        match: (arg) => isObject(arg),
        setMetadata: (metadata, arg) => {
            metadata.defaultValue = arg;
        }
    });
});
