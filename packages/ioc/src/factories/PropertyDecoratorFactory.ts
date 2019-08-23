import { PropertyMetadata } from '../metadatas';
import { createDecorator, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isToken } from '../utils';
import { ArgsIteratorAction } from './ArgsIterator';
import { Token } from '../types';

/**
 * property decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPropertyDecorator<T extends PropertyMetadata> {
    /**
     * define property decorator with param.
     *
     * @param {Token<T>} provider define provider to resolve value to the property.
     */
    (provider: Token): PropertyDecorator;
    /**
     * define property decorator with metadata map.
     * @param {T} [metadata] define matadata map to resolve value to the property.
     */
    (metadata?: T): PropertyDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol): void;
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {ArgsIteratorAction<T>[]} [actions]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string, actions?: ArgsIteratorAction<T>[], metadataExtends?: MetadataExtends<T>): IPropertyDecorator<T> {
    actions = actions || [];
    actions.push((ctx, next) => {
        let arg = ctx.currArg;
        if (isToken(arg)) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        }
    });
    let decorator = createDecorator<T>(name, actions, metadataExtends);
    decorator.decoratorType = DecoratorType.Property;
    return decorator;
}

