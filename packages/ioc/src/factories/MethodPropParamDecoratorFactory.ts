import { TypeMetadata } from '../metadatas/TypeMetadata';
import { MethodParamPropMetadata } from '../metadatas/MethodParamPropMetadata';
import { createDecorator, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { ArgsIteratorAction } from './ArgsIterator';
import { isArray } from '../utils/lang';
import { Token } from '../types';
import { PropParamDecorator } from './ParamPropDecoratorFactory';
import { ProviderTypes } from '../providers/types';
import { isToken } from '../utils/isToken';



export type MethodPropParamDecorator = (target: Object, propertyKey: string | symbol, descriptor?: number | TypedPropertyDescriptor<any>) => void;
/**
 * method, property or parameter decorator.
 *
 * @export
 * @interface IMethodPropParamDecorator
 */
export interface IMethodPropParamDecorator<T extends TypeMetadata> {
    /**
     * define method, property or parameter decorator with metadata map.
     * @param {T} [metadata] metadata map
     */
    (metadata?: T): MethodPropParamDecorator;
    /**
     * define parameter or property decorator with param.
     *
     * @param {Token<T>} provider define provider to resolve value to the parameter or property.
     */
    (provider: Token): PropParamDecorator;

    /**
     * define method decorator with providers.
     *
     * @param {Token<T>} provider define providers to the method.
     */
    (providers: ProviderTypes[]): MethodDecorator;
    /**
     * define method, property or parameter decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: number | TypedPropertyDescriptor<any>): void;
    decoratorType?: DecoratorType;
}

/**
 * create method, property or parameter decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [actions]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IMethodPropParamDecorator<T>}
 */
export function createMethodPropParamDecorator<T extends MethodParamPropMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metadataExtends?: MetadataExtends<T>): IMethodPropParamDecorator<T> {

    actions = actions || [];
    actions.push((ctx, next) => {
        let arg = ctx.currArg;
        if (isArray(arg)) {
            ctx.metadata.providers = arg;
            ctx.next(next);
        } else if (isToken(arg)) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        }
    })
    let decorator = createDecorator<T>(name, actions, metadataExtends);
    decorator.decoratorType = DecoratorType.Method | DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}

