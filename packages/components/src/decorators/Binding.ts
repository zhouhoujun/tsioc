import { Token, isString, isToken, ClassType, Registration, createPropDecorator, isClassType } from '@tsdi/ioc';
import { BindingPropMetadata } from './BindingPropMetadata';
/**
 * Binding decorator.
 *
 * @export
 * @interface BindingPropertyDecorator
 */
export interface BindingPropertyDecorator {
    /**
     * define Binding property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;

    /**
     * define Binding property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingPropMetadata): PropertyDecorator;
    /**
     * define Binding property decorator with binding property name and provider.
     *
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     * @param {*} [defaultVal] default value.
     */
    (provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;

    /**
     * define Binding property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} defaultVal default value.
     */
    (bindingName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Binding property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * Binding decorator.
 */
export const Binding: BindingPropertyDecorator = createPropDecorator<BindingPropMetadata>('Binding', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg)) {
            ctx.metadata.bindingName = arg;
            ctx.next(next);
        } else if (isClassType(arg) || arg instanceof Registration) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;
        if ((ctx.args.length > 2 && isToken(arg))) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        } else {
            ctx.metadata.defaultValue = arg;
        }

    },
    (ctx, next) => {
        ctx.metadata.defaultValue = ctx.currArg;
    }
], meta => {
    if (!meta.direction) {
        meta.direction = 'twoway';
    }
});
