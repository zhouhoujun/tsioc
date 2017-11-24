import 'reflect-metadata';
import { ParamPropMetadata, TypeMetadata } from '../metadatas';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { Registration } from '../Registration';
import { isClass, isToken } from '../utils';
import { isString, isSymbol } from 'util';
import { ArgsIterator } from './ArgsIterator';
import { Token } from '../types';



export type PropParamDecorator = (target: Object, propertyKey: string | symbol, parameterIndex?: number) => void;
/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator<T extends ParamPropMetadata> {
    (provider: Token<any>): PropParamDecorator;
    (metadata?: T): PropParamDecorator;
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}

/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IParamPropDecorator<T>}
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IParamPropDecorator<T> {
    let paramPropAdapter = ((args: ArgsIterator) => {
        if (adapter) {
            adapter(args);
        }
        args.next<T>({
            isMetadata: (arg) => isParamPropMetadata(arg),
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
    let decorator = createDecorator<T>(name, paramPropAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}


/**
 * check object is param prop metadata or not.
 *
 * @export
 * @param {any} metadata
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isParamPropMetadata(metadata, extendsProps?: string[]): boolean {
    if (!metadata) {
        return false;
    }
    if (isToken(metadata)) {
        return false;
    }
    let props = ['type', 'provider', 'index'];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }
    return Object.keys(metadata).some(n => props.indexOf(n) > 0)
}

