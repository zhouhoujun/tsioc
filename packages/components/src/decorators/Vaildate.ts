import { createPropDecorator, isBoolean, isFunction, PropertyMetadata, isString } from '@tsdi/ioc';
import { IPropertyVaildate } from '../bindings/IBinding';

/**
 * vaildate property metadata.
 */
export interface VaildatePropertyMetadata extends PropertyMetadata, IPropertyVaildate {

}

/**
 * Vaildate decorator.
 *
 * @export
 * @interface VaildatePropertyDecorator
 */
export interface VaildatePropertyDecorator {
    /**
     * define Vaildate property is required or not.
     *
     * @param {boolean} required property is required or not.
     * @param {string} message error message of required.
     */
    (required: boolean, message?: string): PropertyDecorator;

    /**
     * define Vaildate property decorator.
     *
     * @param {((value: any, target?: any) => boolean | Promise<boolean>)} vaild vaild func for property.
     * @param {string} message error message of required.
     */
    (vaild: (value: any, target?: any) => boolean | Promise<boolean>, message?: string): PropertyDecorator;
    /**
     * define Vaildate property decorator with metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: VaildatePropertyMetadata): PropertyDecorator;

}

/**
 * Vaildate decorator.
 */
export const Vaildate: VaildatePropertyDecorator = createPropDecorator<VaildatePropertyMetadata>('Vaildate', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isBoolean(arg)) {
            ctx.metadata.required = arg;
            ctx.next(next);
        } else if (isFunction(arg)) {
            ctx.metadata.vaild = arg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;
        if ((ctx.args.length > 2 && isString(arg))) {
            ctx.metadata.errorMsg = arg;
            ctx.next(next);
        }

    }
]) as VaildatePropertyDecorator;
