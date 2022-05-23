import 'reflect-metadata';
import { isUndefined, isNumber, isString } from '../utils/chk';
import { AbstractMetadata, ClassMetadata, ParameterMetadata, PatternMetadata, PropertyMetadata } from './meta';
import { getToken, Token } from '../tokens';
import { DecoratorOption } from './refl';
import * as refl from './refl';
import { Decors, ActionTypes } from './type';
import { Type } from '../types';
import { isMetadataObject } from '../utils/obj';

/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction[]} [actions]  metadata iterator actions.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*} decorator.
 */
export function createDecorator<T>(name: string, option: DecoratorOption<T>): any {
    const decor = `@${name}`;
    const factory = (...args: any[]) => {
        let metadata: T;
        if (args.length) {
            if (args.length === 1 && isMetadataObject(args[0])) {
                metadata = args[0]
            } else if (option.props) {
                metadata = option.props(...args)
            }
        }

        return (...pms: any[]) => {
            return storeMetadata(name, decor, pms, metadata, option)
        }
    }

    factory.toString = () => decor;
    return factory
}

function storeMetadata<T>(name: string, decor: string, args: any[], metadata: any, option: DecoratorOption<T>): any {
    let target, propertyKey;
    if (!metadata) {
        metadata = {}
    }
    if (option.appendProps) {
        option.appendProps(metadata)
    }
    switch (args.length) {
        case 1:
            target = args[0];
            if (target) {
                refl.dispatchTypeDecor(target, refl.toDefine(name, decor, metadata, Decors.CLASS, option), option)
                return target
            }
            break;
        case 2:
            target = args[0];
            propertyKey = args[1];
            refl.dispatchPorpDecor(target, refl.toDefine(name, decor, metadata, Decors.property, option, propertyKey), option)
            break;
        case 3:
            if (isNumber(args[2])) {
                target = args[0];
                propertyKey = args[1];
                const parameterIndex = args[2];
                refl.dispatchParamDecor(target, refl.toDefine(name, decor, metadata, Decors.parameter, option, propertyKey, parameterIndex), option)
            } else if (isUndefined(args[2])) {
                target = args[0];
                propertyKey = args[1];
                refl.dispatchPorpDecor(target, refl.toDefine(name, decor, metadata, Decors.property, option, propertyKey), option)
            } else {
                target = args[0];
                propertyKey = args[1];
                const descriptor = args[2] as TypedPropertyDescriptor<any>;
                if (!descriptor) {
                    return
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    refl.dispatchPorpDecor(target, refl.toDefine(name, decor, metadata, Decors.property, option, propertyKey), option)
                } else {
                    refl.dispatchMethodDecor(target, refl.toDefine(name, decor, metadata, Decors.method, option, propertyKey), option)
                }
                return descriptor
            }
            break;
        default:
            throw new Error(`Invalid @${name} Decorator declaration.`)
    }
}

export interface IClassDecorator {
    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable()
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;

    (provide: Token, alias: string, pattern?: PatternMetadata): ClassDecorator;
}

/**
 * class method decorator.
 */
export type ClassMethodDecorator = (target: Object | Type, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

/**
 * method property decorator.
 */
export type MethodPropDecorator = (target: Object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

/**
 * property parameter decorator.
 */
export type PropParamDecorator = (target: Object, propertyKey: string | symbol, parameterIndex?: number | TypedPropertyDescriptor<any>) => void;

/**
 * method property parameter decorator.
 */
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
export function createParamDecorator<T = ParameterMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, {
        actionType: [ActionTypes.paramInject],
        props: (provider: Token, alias?: string | Record<string, any>) => {
            if (alias) {
                return isString(alias) ? { provider: getToken(provider, alias) } : { provider: getToken(provider, alias.alias), ...alias, alias: undefined } as any
            } else {
                return { provider }
            }
        },
        ...options
    })
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
export function createPropDecorator<T = PropertyMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, {
        actionType: [ActionTypes.propInject],
        props: (provider: Token, alias?: string) => ({ provider, alias } as any),
        ...options
    })
}


/**
 * Abstract decorator. define the class as abstract class.
 */
export interface IAbstractDecorator {
    /**
     * define class is abstract class.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: AbstractMetadata): ClassDecorator;
}

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IAbstractDecorator = createDecorator<AbstractMetadata>('Abstract', {
    appendProps: (meta) => {
        meta.abstract = true
    }
});
