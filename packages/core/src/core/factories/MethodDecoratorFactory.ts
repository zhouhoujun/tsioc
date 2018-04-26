import 'reflect-metadata';
import { MethodMetadata } from '../metadatas/index';
import { Type,  Providers} from '../../types';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { ArgsIterator } from './ArgsIterator';
import { isArray } from '../../utils/index';


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
     * @param  {Providers[]} [providers]
     */
    (providers?: Providers[]): MethodDecorator;
    /**
     * create method decorator with metadata map.
     * @param {T} [metadata]
     */
    (metadata?: T): MethodDecorator;
    
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;
}


/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IMethodDecorator<T> {

    let methodAdapter = (args: ArgsIterator) => {
        if (adapter) {
            adapter(args);
        }

        args.next<T>({
            match: (arg) => isArray(arg),
            setMetadata: (metadata, arg) => {
                metadata.providers = arg;
            }
        });
    }

    let decorator = createDecorator<T>(name, methodAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Method;
    return decorator;
}
