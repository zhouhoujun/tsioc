import { isString, ParamPropMetadata, createPropDecorator } from '@tsdi/ioc';


/**
 * HostBinding metadata.
 *
 */
export interface HostBindingMetadata extends ParamPropMetadata {
    /**
     * host property name.
     *
     * @type {string}
     * @memberof BindingPropertyMetadata
     */
    hostPropertyName?: string;
}

/**
 * HostBinding decorator.
 *
 * @export
 * @interface HostBindingPropertyDecorator
 */
export interface HostBindingPropertyDecorator {
    /**
     * define HostBinding property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (eventName: string, args: []): PropertyDecorator;

    /**
     * define HostBinding property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: HostBindingMetadata): PropertyDecorator;
}

/**
 * output property decorator.
 */
export const HostBinding: HostBindingPropertyDecorator = createPropDecorator<HostBindingMetadata>('HostBinding', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg)) {
            ctx.metadata.hostPropertyName = arg;
            ctx.next(next);
        }
    }
]);
