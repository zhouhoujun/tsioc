import { ParamPropMetadata } from '../metadatas/ParamPropMetadata';
import { Token } from '../types';
import { createDecorator, MetadataExtends } from './DecoratorFactory';
import { isToken } from '../utils/isToken';
import { ArgsIteratorAction } from './ArgsIterator';


/**
 * property parameter decorator.
 */
export type PropParamDecorator = (target: Object, propertyKey: string | symbol, parameterIndex?: number | TypedPropertyDescriptor<any>) => void;

/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator<T extends ParamPropMetadata> {
    /**
     * define parameter or property decorator with param.
     *
     * @param {Token<T>} provider define provider to resolve value to the parameter or property.
     */
    (provider: Token): PropParamDecorator;
    /**
     * define parameter or property decorator with metadata map.
     * @param {T} [metadata] define matadata map to resolve value to the parameter or property.
     */
    (metadata?: T): PropParamDecorator;
    /**
     * define parameter or property decorator.
     */
    (target: object, propertyKey: string | symbol, parameterIndex?: number | TypedPropertyDescriptor<any>): void;
}

/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IParamPropDecorator<T>}
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metadataExtends?: MetadataExtends<T>): IParamPropDecorator<T> {
    actions = actions || [];
    actions.push((ctx, next) => {
        let arg = ctx.currArg;
        if (isToken(arg)) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        }
    });
    let decorator = createDecorator<T>(name, actions, metadataExtends);
    return decorator;
}

