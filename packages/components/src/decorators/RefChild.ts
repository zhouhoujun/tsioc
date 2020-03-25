import { isString, isToken, Registration, ClassType, Token, createPropDecorator, isClassType } from '@tsdi/ioc';
import { BindingPropMetadata } from './BindingPropMetadata';


export type RefChildDectorator = (target: Object, propertyKey: string | symbol) => void;


/**
 * RefChild decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<IRefChildMetadata>}
 */
export interface IRefChildDecorator {
    /**
     * define RefChild property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;

    /**
     * define RefChild property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingPropMetadata): PropertyDecorator;
    /**
     * define RefChild property decorator with binding property name and provider.
     *
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;
    /**
     * define RefChild property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} defaultVal default value.
     */
    (bindingName: string, defaultVal: any): PropertyDecorator;
    /**
     * define RefChild property decorator with binding property name and provider.
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
 * RefChild decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`RefChildLifecycle`]
 *
 * @RefChild
 */
export const RefChild: IRefChildDecorator = createPropDecorator<BindingPropMetadata>('RefChild', [
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

