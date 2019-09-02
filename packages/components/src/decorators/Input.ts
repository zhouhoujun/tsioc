import { Token, isString, PropParamDecorator, createParamPropDecorator, isToken, ClassType, Registration } from '@tsdi/ioc';
import { BindingPropertyMetadata } from './BindingPropertyMetadata';

/**
 * Input decorator.
 *
 * @export
 * @interface InputPropertyDecorator
 */
export interface InputPropertyDecorator {
    /**
     * define Input property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropParamDecorator;

    /**
     * define Input property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingPropertyMetadata): PropParamDecorator;
    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     */
    (bindingName: string, provider: Registration | ClassType): PropParamDecorator;

    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} binding default value.
     */
    (bindingName: string, defaultVal: any): PropParamDecorator;

    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} binding default value.
     */
    (bindingName: string, provider: Token, defaultVal: any): PropParamDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}

export const Input: InputPropertyDecorator = createParamPropDecorator<BindingPropertyMetadata>('Input', [
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
