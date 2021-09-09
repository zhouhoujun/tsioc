import 'reflect-metadata';
import { isUndefined, isNumber, isMetadataObject } from '../utils/chk';
import { ClassMetadata, ParameterMetadata, PatternMetadata, PropertyMetadata, TypeMetadata } from './meta';
import { Type } from '../types';
import { Token } from '../tokens';
import { DecoratorOption } from './refl';
import * as refl from './refl';

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
export function createDecorator<T>(name: string, option: DecoratorOption<T>): any {
    const decor = `@${name}`;
    const factory = (...args: any[]) => {
        let metadata: T;
        if (args.length) {
            if (args.length === 1 && isMetadataObject(args[0])) {
                metadata = args[0];
            } else if (option.props) {
                metadata = option.props(...args);
            }
        }

        return (...pms: any[]) => {
            return storeMetadata(name, decor, pms, metadata, option);
        }
    }

    factory.toString = () => decor;
    return factory;
}

function storeMetadata<T>(name: string, decor: string, args: any[], metadata: any, option: DecoratorOption<T>): any {
    let target, propertyKey;
    if (!metadata) {
        metadata = {};
    }
    if (option.appendProps) {
        option.appendProps(metadata);
    }
    switch (args.length) {
        case 1:
            target = args[0];
            if (target) {
                refl.dispatchTypeDecor(target, refl.toDefine(name, decor, metadata, 'class', option))
                return target;
            }
            break;
        case 2:
            target = args[0];
            propertyKey = args[1];
            refl.dispatchPorpDecor(target, refl.toDefine(name, decor, metadata, 'property', option, propertyKey))
            break;
        case 3:
            if (isNumber(args[2])) {
                target = args[0];
                propertyKey = args[1];
                let parameterIndex = args[2];
                refl.dispatchParamDecor(target, refl.toDefine(name, decor, metadata, 'parameter', option, propertyKey, parameterIndex));
            } else if (isUndefined(args[2])) {
                target = args[0];
                propertyKey = args[1];
                refl.dispatchPorpDecor(target, refl.toDefine(name, decor, metadata, 'property', option, propertyKey));
            } else {
                target = args[0];
                propertyKey = args[1];
                let descriptor = args[2] as TypedPropertyDescriptor<any>;
                if (!descriptor) {
                    return;
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    refl.dispatchPorpDecor(target, refl.toDefine(name, decor, metadata, 'property', option, propertyKey));
                } else {
                    refl.dispatchMethodDecor(target, refl.toDefine(name, decor, metadata, 'method', option, propertyKey));
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
     * @Injectable()
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;

    (provide: Token, alias: string, pattern?: PatternMetadata): ClassDecorator;
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
export function createParamDecorator<T = ParameterMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, {
        actionType: ['paramInject'],
        props: (provider: Token, alias?: string) => ({ provider, alias } as any),
        ...options
    });
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
export function createPropDecorator<T = PropertyMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, {
        actionType: ['propInject'],
        props: (provider: Token, alias?: string) => ({ provider, alias } as any),
        ...options
    });
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
    (metadata?: TypeMetadata): ClassDecorator;
}

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IAbstractDecorator = createDecorator<TypeMetadata>('Abstract', {
    appendProps: (meta) => {
        meta.abstract = true;
    }
});
