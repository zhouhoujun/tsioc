import { Token, isString, isToken, ClassType, Registration, createPropDecorator, isClassType } from '@tsdi/ioc';
import { BindingMetadata } from './metadata';
import { BindingDirection, isBindingDriection } from '../bindings/IBinding';
/**
 * Bindings decorator.
 *
 * @export
 * @interface BindingsPropertyDecorator
 */
export interface BindingsPropertyDecorator {
    /**
     * define Bindings property decorator with binding property name.
     *
     * @param {BindingDirection} direction binding direction. default twoway
     */
    (direction?: BindingDirection): PropertyDecorator;
    /**
     * define Bindings property decorator with binding property name.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {string} bindingName binding property name
     */
    (direction: BindingDirection, bindingName?: string): PropertyDecorator;

    /**
     * define Bindings property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
    /**
     * define Bindings property decorator with binding property name and provider.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     * @param {*} [defaultVal] default value.
     */
    (direction: BindingDirection, provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;

    /**
     * define Bindings property decorator with binding property name and provider.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {string} bindingName binding property name
     * @param {*} defaultVal default value.
     */
    (direction: BindingDirection, bindingName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Bindings property decorator with binding property name and provider.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (direction: BindingDirection, bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;
}

/**
 * Bindings decorator.
 */
export const Bindings: BindingsPropertyDecorator = createPropDecorator<BindingMetadata>('Bindings', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isBindingDriection(arg)) {
            ctx.metadata.direction = arg;
            ctx.next(next);
        }
    },
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
