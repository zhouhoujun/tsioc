import 'reflect-metadata';
import { PropertyMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass } from '../utils';
import { isString } from 'util';
import { ArgsIterator } from './ArgsIterator';
import { Registration } from '../index';


/**
 * property decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPropertyDecorator<T extends PropertyMetadata> {
    (provider: Type<any> | Registration<any> | string): PropertyDecorator;
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
            match: (arg) => isClass(arg) || isString(arg) || arg instanceof Registration,
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


/**
 * check object is property metadata or not.
 *
 * @export
 * @param {any} metadata
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isPropertyMetadata(metadata, extendsProps?: string[]): boolean {
    if (!metadata) {
        return false;
    }
    let props = ['type', 'provider'];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }
    return Object.keys(metadata).some(n => props.indexOf(n) > 0)
}
