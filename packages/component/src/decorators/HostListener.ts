import { isString, ParamPropMetadata, createPropDecorator, isArray } from '@tsdi/ioc';


/**
 * HostListener metadata.
 *
 */
export interface HostListenerMetadata extends ParamPropMetadata {
    /**
     * event name.
     *
     * @type {string}
     * @memberof BindingPropertyMetadata
     */
    eventName?: string;
    /**
     * default value.
     *
     * @type {*}
     * @memberof BindingPropertyMetadata
     */
    args?: string[];
}

/**
 * HostListener decorator.
 *
 * @export
 * @interface HostListenerPropertyDecorator
 */
export interface HostListenerPropertyDecorator {
    /**
     * define HostListener property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (eventName: string, args: []): PropertyDecorator;

    /**
     * define HostListener property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: HostListenerMetadata): PropertyDecorator;
}

/**
 * output property decorator.
 */
export const HostListener: HostListenerPropertyDecorator = createPropDecorator<HostListenerMetadata>('HostListener', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg)) {
            ctx.metadata.eventName = arg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isArray(arg)) {
            ctx.metadata.args = arg;
        }
    }
]);
