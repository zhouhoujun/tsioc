import 'reflect-metadata';
import { isUndefined, isNumber, isMetadataObject } from '../utils/chk';
import { ClassMetadata, ParameterMetadata, PatternMetadata, PropertyMetadata } from './metadatas';
import { Type } from '../types';
import { Token } from '../tokens';
import { DecoratorOption, DecorRegisteredOption } from './refl';
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
export function createDecorator<T>(name: string, options: DecoratorOption<T>): any {
    const decor = `@${name}`;
    const option = refl.registerDecror(decor, options);
    const factory = (...args: any[]) => {
        let metadata: T = null;
        if (args.length) {
            if (args.length === 1 && isMetadataObject(args[0])) {
                metadata = args[0];
            } else if (option.props) {
                metadata = option.props(...args);
            }
        }

        return (...args: any[]) => {
            return storeMetadata(name, decor, args, metadata, option);
        }
    }

    factory.toString = () => decor;
    return factory;
}

function storeMetadata<T>(name: string, decor: string, args: any[], metadata: any, option: DecorRegisteredOption): any {
    let target;
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
                refl.dispatchTypeDecor(target, { name, decor, matedata: metadata, decorType: 'class', decorPdr: option })
                return target;
            }
            break;
        case 2:
            target = args[0];
            let propertyKey = args[1];
            refl.dispatchPorpDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'property', decorPdr: option })
            break;
        case 3:
            if (isNumber(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                let parameterIndex = args[2];
                refl.dispatchParamDecor(target, { name, decor, matedata: metadata, propertyKey, parameterIndex, decorType: 'parameter', decorPdr: option });
            } else if (isUndefined(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                refl.dispatchPorpDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'property', decorPdr: option });
            } else {
                target = args[0];
                let propertyKey = args[1];
                let descriptor = args[2] as TypedPropertyDescriptor<any>;
                if (!descriptor) {
                    return;
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    refl.dispatchPorpDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'property', decorPdr: option });
                } else {
                    refl.dispatchMethodDecor(target, { name, decor, matedata: metadata, propertyKey, decorType: 'method', decorPdr: option });
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
