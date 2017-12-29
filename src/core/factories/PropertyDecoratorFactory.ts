import 'reflect-metadata';
import { PropertyMetadata } from '../metadatas/index';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass, isToken, isString, isSymbol, isPropertyMetadata } from '../../utils/index';
import { ArgsIterator } from './ArgsIterator';
import { Token } from '../../types';
import { Registration } from '../../Registration';


/**
 * property decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPropertyDecorator<T extends PropertyMetadata> {
    (provider: Token<any>): PropertyDecorator;
    (metadata?: T): PropertyDecorator;
    (target: object, propertyKey: string | symbol): void;
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): IPropertyDecorator<T> {
    let propPropAdapter = ((args: ArgsIterator) => {
        if (adapter) {
            adapter(args);
        }
        args.next<T>({
            isMetadata: (arg) => isPropertyMetadata(arg),
            match: (arg) => isToken(arg),
            setMetadata: (metadata, arg) => {
                metadata.provider = arg;
            }
        });
        // args.next<T>({
        //     match: (arg) => isString(arg),
        //     setMetadata: (metadata, arg) => {
        //         metadata.alias = arg;
        //     }
        // });
    });
    let decorator = createDecorator<T>(name, propPropAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Property;
    return decorator;
}

