import 'reflect-metadata';
import { ArgsIteratorAction } from './ArgsIterator';
import { ClassMetadata } from '../metadatas';
import { Type, Token, ProvideToken } from '../types';
import { createDecorator, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isString, isNumber, isBoolean, isToken, isProvideToken } from '../utils';

/**
 * Type decorator.
 *
 * @export
 * @interface ITypeDecorator
 * @template T
 */
export interface ITypeDecorator<T extends ClassMetadata> {
    /**
     * define class decorator setting with metadata map.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: T): ClassDecorator;
    /**
     * not allow abstract to decorator with out metadata.
     */
    (target: Type): void;
}

/**
 * class decorator.
 *
 * @export
 * @interface IClassDecorator
 */
export interface IClassDecorator<T extends ClassMetadata> extends ITypeDecorator<T> {

    /**
     * define class decorator setting with params.
     *
     * @param {ProvideToken} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provide: ProvideToken<any>): ClassDecorator;

    /**
     * define class decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;

    /**
     * define class decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {Token} [refTarget]  define the class as service of target.
     */
    (provide: Token, alias: string, refTarget: Token): ClassDecorator;

    /**
     * define class decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {Token} [refTarget]  define the class as service of target.
     */
    (provide: Token, alias: string, singlton: boolean, refTarget: Token): ClassDecorator;

    /**
     * define class decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {number} [cache]  define class cahce expris when is not singlton.
     * @param {Token} [refTarget]  define the class as service of target.
     */
    (provide: Token, alias: string, cache: number, refTarget: Token): ClassDecorator;

}




/**
 * create class decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {boolean} [appendCheck]
 * @returns {IClassDecorator<T>}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string, appendCheck?: boolean): IClassDecorator<T>;
/**
 * create class decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]
 * @param {boolean} [appendCheck]
 * @returns {IClassDecorator<T>}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string, actions?: ArgsIteratorAction<T>[], appendCheck?: boolean): IClassDecorator<T>;
/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {ArgsIteratorAction<T>[]} [actions]  metadata iterator action.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @param {boolean} [appendCheck] default false
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string, actions?: ArgsIteratorAction<T>[], metadataExtends?: MetadataExtends<T>, appendCheck?: boolean): IClassDecorator<T>;
export function createClassDecorator<T extends ClassMetadata>(name: string, actions?: any, metadataExtends?: any, appendCheck = false): IClassDecorator<T> {
    if (isBoolean(actions)) {
        appendCheck = actions;
        actions = undefined;
        metadataExtends = undefined;
    } else if (isBoolean(metadataExtends)) {
        appendCheck = metadataExtends;
        metadataExtends = undefined;
    }

    if (appendCheck) {
        actions = actions || [];
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
    }
    let decorator = createDecorator<T>(name, actions, metadataExtends);
    decorator.decoratorType = DecoratorType.Class;
    return decorator;
}

