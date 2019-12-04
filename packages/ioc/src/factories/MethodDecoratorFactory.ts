import 'reflect-metadata';
import { MethodMetadata } from '../metadatas/MethodMetadata';
import { ParamProviders } from '../providers/types';
import { createDecorator, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { ArgsIteratorAction } from './ArgsIterator';


/**
 * Method decorator.
 *
 * @export
 * @interface IMethodDecorator
 */
export interface IMethodDecorator<T extends MethodMetadata> {
    /**
     * create method decorator with providers.
     *
     * @param  {ParamProviders[]} [providers]
     */
    (providers?: ParamProviders[]): MethodDecorator;
    /**
     * create method decorator with metadata map.
     * @param {T} [metadata]
     */
    (metadata?: T): MethodDecorator;
    /**
     * create method decorator.
     * @param {Object} target
     * @param {(string | symbol)} propertyKey
     * @param {TypedPropertyDescriptor<any>} descriptor
     */
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;

    decoratorType?: DecoratorType;
}


/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {ArgsIteratorAction<T>[]} [actions]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metadataExtends?: MetadataExtends<T>): IMethodDecorator<T> {

    let decorator = createDecorator<T>(name, actions, metadataExtends);
    decorator.decoratorType = DecoratorType.Method;
    return decorator;
}
