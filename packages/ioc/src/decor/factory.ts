import 'reflect-metadata';
import {
    isClass, isAbstractClass, isMetadataObject, isUndefined,
    isNumber, isArray, chain, isBoolean, isString
} from '../utils/lang';
import { Type } from '../types';
import { isToken, isProvideToken } from '../tokens';
import {
    Metadata, ClassMetadata, MethodMetadata, PropertyMetadata, ParameterMetadata,
    TypeMetadata, MethodPropMetadata, MethodParamPropMetadata, ParamPropMetadata, ProvideMetadata
} from './metadatas';
import { ArgsContext, ArgsIteratorAction } from './args';
import { refl } from './reflects';



export interface MetadataTarget<T> {
    (target: Type | object): Type | object
}

export interface DecoratorOption<T> extends refl.DecorRegisterOption {
    actions?: ArgsIteratorAction<T>[];
    append?(metadata: T): void;
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

    let factory = (...args: any[]) => {
        let metadata: T = null;
        if (args.length < 1) {
            return (...args: any[]) => {
                return storeMetadata(name, decor, args, metadata, options);
            }
        }
        metadata = argsToMetadata<T>(args, options.actions);
        if (metadata) {
            return (...args: any[]) => {
                return storeMetadata(name, decor, args, metadata, options);
            }
        } else {
            if (args.length === 1) {
                if (!isClass(args[0])) {
                    return (...args: any[]) => {
                        return storeMetadata(name, decor, args, metadata, options);
                    };
                }
            }
        }
        return storeMetadata(name, decor, args, metadata, options);
    }

    if (options.handler) {
        refl.registerDecror(decor, options);
    }
    factory.toString = () => decor;
    return factory;
}

function argsToMetadata<T extends Metadata>(args: any[], actions?: ArgsIteratorAction<T>[]): T {
    let metadata: T = null;
    if (args.length) {
        if (args.length === 1 && isMetadataObject(args[0])) {
            metadata = args[0];
        } else if (actions) {
            let ctx = new ArgsContext<T>(args);
            chain(actions, ctx);
            metadata = ctx.getMetadate();
        }
    }
    return metadata;
}


function storeMetadata<T>(name: string, decor: string, args: any[], metadata: any, options: DecoratorOption<T>): any {
    let target;
    if (!metadata) {
        metadata = {};
    }
    if (options.append) {
        options.append(metadata);
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


export interface ClassDecoratorOption<T> extends DecoratorOption<T> {
    classAnno?: boolean;
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
export function createClassDecorator<T extends ClassMetadata>(name: string, options?: ClassDecoratorOption<T>) {
    options = options || {};
    if (options.classAnno) {
        let actions = options.actions || [];
        actions.push(
            (ctx, next) => {
                let arg = ctx.currArg;
                if ((ctx.args.length > 1) ? isToken(arg) : isProvideToken(arg)) {
                    ctx.metadata.provide = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.alias = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isBoolean(arg)) {
                    ctx.metadata.singleton = arg;
                    ctx.next(next);
                } else if (isNumber(arg)) {
                    ctx.metadata.expires = arg;
                    ctx.next(next);
                } else if (isToken(arg)) {
                    ctx.metadata.refs = { target: arg, provide: ctx.metadata.provide || ctx.metadata.type, alias: ctx.metadata.alias };
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isNumber(arg)) {
                    ctx.metadata.expires = arg;
                    ctx.next(next);
                }
            }
        );
        options.actions = actions;
    }
    let decorator = createDecorator<T>(name, options);
    return decorator;
}


export type ClassMethodDecorator = (target: Object | Type, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;


/**
 * create decorator for class and method.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns {IClassMethodDecorator<T>}
 */
export function createClassMethodDecorator<T extends TypeMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, options || {});
}


/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, options || {});
}

export type MethodPropDecorator = (target: Object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => void;
/**
 * method and Property decorator.
 *
 * @export
 * @interface IMethodPropDecorator
 */
export interface IMethodPropDecorator<T extends MethodPropMetadata> {
    /**
     * create method decorator with metadata map.
     * @param {T} [metadata]
     */
    (metadata?: T): MethodPropDecorator;
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * create method or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns {IMethodPropDecorator<T>}
 */
export function createMethodPropDecorator<T extends MethodPropMetadata>(name: string, options?: DecoratorOption<T>): IMethodPropDecorator<T> {
    return createDecorator<T>(name, options || {});
}

export type MethodPropParamDecorator = (target: Object, propertyKey: string | symbol, descriptor?: number | TypedPropertyDescriptor<any>) => void;

/**
 * create method, property or parameter decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns {IMethodPropParamDecorator<T>}
 */
export function createMethodPropParamDecorator<T extends MethodParamPropMetadata>(name: string, options?: DecoratorOption<T>) {
    options = options || {};
    let actions = options.actions || [];
    actions.push((ctx, next) => {
        let arg = ctx.currArg;
        if (isArray(arg)) {
            ctx.metadata.providers = arg;
            ctx.next(next);
        } else if (isToken(arg)) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        }
    });
    options.actions = actions;
    return createDecorator<T>(name, options);
}

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
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {DecoratorOption<T>} [options] decorator options.
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, appendDefaultProvider(options));
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
export function createPropDecorator<T extends PropertyMetadata>(name: string, options?: DecoratorOption<T>) {
    return createDecorator<T>(name, appendDefaultProvider(options));
}


function appendDefaultProvider<T extends ProvideMetadata>(options?: DecoratorOption<T>): DecoratorOption<T> {
    options = options || {};
    let actions = options.actions || [];
    actions.push((ctx, next) => {
        let arg = ctx.currArg;
        if (isToken(arg)) {
            ctx.metadata.provider = arg;
            ctx.next(next);
        }
    });
    options.actions = actions;
    return options;
}
