import 'reflect-metadata';
import { AnnotationMetadata, ParameterMetadata, PatternMetadata, PropertyMetadata } from './meta';
import { DecoratorOption, dispatchMethodDecor, dispatchParamDecor, dispatchPropertyDecor, dispatchTypeDecor, MetadataFactory, toDefine } from './refl';
import { Decors, ActionTypes, DecoratorType, DecoratorFn } from './class';
import { isUndefined, isNumber, isString, isArray } from '../utils/chk';
import { getToken, Token } from '../tokens';
import { AbstractType } from '../types';
import { isMetadataObject } from '../utils/obj';
import { Exception } from '../exception';
import { composeHandlers, HandlerFn } from '../handler';




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
        let metadata: Partial<T>;
        if (args.length) {
            if (args.length === 1 && (option.isMatadata ? option.isMatadata(args[0]) : isMetadataObject(args[0]))) {
                metadata = args[0]
            } else if (option.props) {
                metadata = option.props(...args)
            }
        }

        return (...pms: any[]) => {
            return storeMetadata(factory, pms, metadata, option)
        }
    };

    if (option.def) factory.getHandler = mapToFac(option.def as Record<string, HandlerFn | HandlerFn[]>);
    if (option.design) factory.getDesignHandler = mapToFac(option.design as Record<string, HandlerFn | HandlerFn[]>);
    if (option.runtime) factory.getRuntimeHandler = mapToFac(option.runtime as Record<string, HandlerFn | HandlerFn[]>);
    factory.toString = () => decor;
    factory.decorator = decor;
    return factory
}


function mapToFac(maps: Record<string, HandlerFn | HandlerFn[]>): (type: DecoratorType) => HandlerFn | undefined {
    const mapHd: Record<string, HandlerFn> = {};
    for (const type in maps) {
        const handle = maps[type];
        if (!handle) continue;
        mapHd[type] = isArray(handle) ? composeHandlers(handle) : handle
    }
    return (type: DecoratorType) => mapHd[type];
}

function storeMetadata<T>(decor: DecoratorFn, args: any[], metadata: any, option: MetadataFactory<T>): any {
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
                dispatchTypeDecor(target, toDefine(decor, metadata, Decors.CLASS, option), option)
                return target
            }
            break;
        case 2:
            target = args[0];
            propertyKey = args[1];
            dispatchPropertyDecor(target, toDefine(decor, metadata, Decors.property, option, propertyKey), option)
            break;
        case 3:
            if (isNumber(args[2])) {
                target = args[0];
                propertyKey = args[1];
                const parameterIndex = args[2];
                dispatchParamDecor(target, toDefine(decor, metadata, Decors.parameter, option, propertyKey, parameterIndex), option)
            } else if (isUndefined(args[2])) {
                target = args[0];
                propertyKey = args[1];
                dispatchPropertyDecor(target, toDefine(decor, metadata, Decors.property, option, propertyKey), option)
            } else {
                target = args[0];
                propertyKey = args[1];
                const descriptor = args[2] as TypedPropertyDescriptor<any>;
                if (!descriptor) {
                    return
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    dispatchPropertyDecor(target, toDefine(decor, metadata, Decors.property, option, propertyKey), option)
                } else {
                    dispatchMethodDecor(target, toDefine(decor, metadata, Decors.method, option, propertyKey), option)
                }
                return descriptor
            }
            break;
        default:
            throw new Exception(`Invalid @${decor.toString()} Decorator declaration.`)
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
    (metadata?: AnnotationMetadata): ClassDecorator;

    (provide: Token, alias: string, pattern?: PatternMetadata): ClassDecorator;
}

/**
 * class method decorator.
 */
export type ClassMethodDecorator = (target: Object | AbstractType, propertyKey?: string | symbol | undefined, descriptor?: TypedPropertyDescriptor<any>) => void;

/**
 * method property decorator.
 */
export type MethodPropDecorator = (target: Object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;

/**
 * property parameter decorator.
 */
export type PropParamDecorator = (target: Object, propertyKey: string | symbol | undefined, parameterIndex?: number | TypedPropertyDescriptor<any>) => void;

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
        actionType: ActionTypes.inject,
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
        actionType: ActionTypes.inject,
        props: (provider: Token, alias?: string) => ({ provider, alias } as any),
        ...options
    })
}


/**
 * Abstract decorator. define the class as abstract class.
 * 
 * 抽象类修饰器，声明该类为抽象类。
 */
export interface IAbstractDecorator {
    /**
     * Abstract decorator. define class is abstract class.
     *
     * 抽象类修饰器，声明该类为抽象类。
     * @param [metadata] metadata map.
     */
    (): ClassDecorator;
}

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IAbstractDecorator = createDecorator<AnnotationMetadata>('Abstract', {
    appendProps: (meta) => {
        meta.abstract = true
    }
});
