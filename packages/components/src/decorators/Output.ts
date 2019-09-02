import { Token, isString, isToken, ClassType, Registration, createPropDecorator, IPropertyDecorator } from '@tsdi/ioc';
import { BindingPropertyMetadata } from './BindingPropertyMetadata';

/**
 * Output decorator.
 *
 * @export
 * @interface OutputPropertyDecorator
 */
export interface OutputPropertyDecorator {
    /**
     * define Output property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;

    /**
     * define Output property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingPropertyMetadata): PropertyDecorator;
    /**
     * define Output property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     */
    (bindingName: string, provider: Registration | ClassType): PropertyDecorator;

    /**
     * define Output property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} binding default value.
     */
    (bindingName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Output property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} binding default value.
     */
    (bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;

    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * output property decorator.
 */
export const Output: OutputPropertyDecorator = createPropDecorator<BindingPropertyMetadata>('Output', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg)) {
            ctx.metadata.bindingName = arg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;

        if (ctx.args.length > 2 && isToken(arg)) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        } else {
            ctx.metadata.defaultValue = arg;
        }

    },
    (ctx, next) => {
        ctx.metadata.defaultValue = ctx.currArg;
    }
]);
