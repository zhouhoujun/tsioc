import 'reflect-metadata';
import { ParameterMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass } from '../utils';
import { isString } from 'util';
import { ArgsIterator } from './ArgsIterator';
import { Registration } from '../index';


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParameterDecorator
 */
export interface IParameterDecorator<T extends ParameterMetadata> {
    (provider: Type<any> | Registration<any> | string): ParameterDecorator;
    (metadata?: T): ParameterDecorator;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}



/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IParameterDecorator<T> {

    let paramAdapter = ((args: ArgsIterator) => {
        if (adapter) {
            adapter(args);
        }
        args.next<T>({
            isMetadata: (arg) => isParamMetadata(arg),
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
    let decorator = createDecorator<T>(name, paramAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Parameter;
    return decorator;
}

/**
 * check object is param metadata or not.
 *
 * @export
 * @param {any} metadata
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isParamMetadata(metadata, extendsProps?: string[]): boolean {
    if (!metadata) {
        return false;
    }
    let props = ['type', 'provider', 'index'];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }
    return Object.keys(metadata).some(n => props.indexOf(n) > 0)
}

