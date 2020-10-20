import 'reflect-metadata';
import {
    isClass, isAbstractClass, isMetadataObject, isUndefined, isNumber
} from '../utils/lang';
import { Type } from '../types';
import { isProvideToken, Token } from '../tokens';
import {
    ClassMetadata, PropertyMetadata, ParameterMetadata, ProvideMetadata, PatternMetadata
} from './metadatas';
import { refl } from './reflects';



export interface MetadataTarget<T> {
    (target: Type | object): Type | object
}

export interface DecoratorOption<T> extends refl.DecorRegisterOption {
    /**
     * the decorator is class decorator or not.
     */
    isClassDecor?: boolean;
    metadata?(...args: any[]): T;

    appendMetadata?(metadata: T): void;
}


/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction[]} [actions]  metadata iterator actions.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
export function createDecorator<T>(name: string, options: DecoratorOption<T>): any {
    let decor = `@${name}`;
    const appendMetadata = options.appendMetadata;
    let factory = (...args: any[]) => {
        let metadata: T = null;
        if (args.length < 1) {
            return (...args: any[]) => {
                return storeMetadata(name, decor, args, metadata, appendMetadata);
            }
        }

        if (args.length) {
            if (args.length === 1 && isMetadataObject(args[0])) {
                metadata = args[0];
            } else if (options.metadata) {
                if (options.isClassDecor && args.length === 1 && isProvideToken(args[0])) {
                    metadata = null;
                } else {
                    metadata = options.metadata(...args);
                }
            }
        }

        if (metadata) {
            return (...args: any[]) => {
                return storeMetadata(name, decor, args, metadata, appendMetadata);
            }
        } else {
            if (args.length === 1) {
                if (!isClass(args[0])) {
                    return (...args: any[]) => {
                        return storeMetadata(name, decor, args, metadata, appendMetadata);
                    };
                }
            }
        }
        return storeMetadata(name, decor, args, metadata);
    }

    refl.registerDecror(decor, options);

    factory.toString = () => decor;
    return factory;
}


function storeMetadata<T>(name: string, decor: string, args: any[], metadata: any, appendMetadata?: (metadata: T) => void): any {
    let target;
    if (!metadata) {
        metadata = {};
    }
    if (appendMetadata) {
        appendMetadata(metadata);
    }
    switch (args.length) {
        case 1:
            target = args[0];
            if (isClass(target) || isAbstractClass(target)) {
                refl.dispatchTypeDecor(target, { name, decor, matedata: metadata, decorType: 'class' })
                return target;
            }
            break;
        case 2:
            target = args[0];
            let propertyKey = args[1];
            refl.dispatchPorpDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'property' })
            break;
        case 3:
            if (isNumber(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                let parameterIndex = args[2];
                refl.dispatchParamDecor(target, { name, decor, matedata: metadata, propertyKey, parameterIndex, decorType: 'parameter' });
            } else if (isUndefined(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                refl.dispatchPorpDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'property' });
            } else {
                target = args[0];
                let propertyKey = args[1];
                let descriptor = args[2] as TypedPropertyDescriptor<any>;
                if (!descriptor) {
                    return;
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    refl.dispatchPorpDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'property' });
                } else {
                    refl.dispatchMethodDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'method' });
                }
                return descriptor;
            }
            break;
        default:
            throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}


export interface IClassDecorator {
    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;

    (provide: Token, alias: string, pattern?: PatternMetadata): ClassDecorator;

    /**
     * Injectable decorator.
     */
    (target: Type): void;
}

/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {ClassDecoratorOption<T>} [options]  decorator options.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string, options?: DecoratorOption<T>) {
    options = options || {};
    options.isClassDecor = true;
    if (!options.metadata) {
        options.metadata = (provide: Token, alias?: string, pattern?: PatternMetadata) => {
            return { provide, alias, ...pattern } as ClassMetadata as T;
        }
    }
    let decorator = createDecorator<T>(name, options);
    return decorator;
}


export type ClassMethodDecorator = (target: Object | Type, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

export type MethodPropDecorator = (target: Object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

export type MethodPropParamDecorator = (target: Object, propertyKey: string | symbol, descriptor?: number | TypedPropertyDescriptor<any>) => void;

/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, appendDefaultProvider(options));
}


/**
 * property parameter decorator.
 */
export type PropParamDecorator = (target: Object, propertyKey: string | symbol, parameterIndex?: number | TypedPropertyDescriptor<any>) => void;


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, appendDefaultProvider(options));
}


function appendDefaultProvider<T extends ProvideMetadata>(options?: DecoratorOption<T>): DecoratorOption<T> {
    options = options || {};
    if (!options.metadata) {
        options.metadata = (provider: Token, alias?: string) => {
            return { provider, alias } as T;
        }
    }
    return options;
}
