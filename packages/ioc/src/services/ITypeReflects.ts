import { ClassType, ObjectMap, Type, DefineClassTypes } from '../types';
import { TokenId, Token, tokenId, Provider } from '../tokens';
import { ITypeReflect } from './ITypeReflect';
import { IParameter } from '../IMethodAccessor';
import { IInjector } from '../IInjector';
import { IIocContainer } from '../IIocContainer';
import { IActionInjector } from '../actions/Action';

/**
 *  type reflects interface.
 */
export interface ITypeReflects {
    /**
     * has reflect or not.
     * @param type the type
     */
    has(type: ClassType): boolean;

    /**
     * the type has register in injector or not.
     * @param type
     */
    hasRegister(type: ClassType): boolean;
    /**
     * register reflect info of type.
     * @param type the type
     * @param typeInfo reflect info.
     */
    set(type: ClassType, typeInfo: ITypeReflect): this;
    /**
     * create reflect info of type.
     * @param type type.
     * @param info reflect info.
     */
    create<T extends ITypeReflect>(type: ClassType, info?: T): T;
    /**
     * get reflect info of type.
     * @param type the type.
     */
    get<T extends ITypeReflect>(type: ClassType): T;
    /**
     * delete reflect.
     * @param type class type.
     */
    delete(type: ClassType);
    /**
     * get container.
     */
    getContainer<T extends IIocContainer>(): T;
    /**
     * get injector of type injected.
     * @param type
     */
    getInjector<T extends IInjector>(type: ClassType): T;
    /**
     * get action injector.
     */
    getActionInjector(): IActionInjector;
    /**
     * is the type extends of base class.
     * @param type the token of type.
     * @param base base class.
     */
    isExtends(type: Token, base: ClassType): boolean;
    /**
     * get type base classes.
     * @param type the class of type.
     */
    getExtends(type: ClassType): ClassType[];
    /**
     * has class metadata of decorator or not.
     * @param decorator metadate of decorator.
     * @param target target class.
     */
    hasMetadata<T = any>(decorator: string | Function, target: ClassType): boolean;
    /**
     * has constructor param metadate of decorator or not.
     * @param decorator the decorator to check.
     * @param target the target class.
     * @param type constructor.
     */
    hasMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'constructor'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'method' | 'property'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): boolean;

    hasMethodMetadata(decorator: string | Function, target: any, propertyKey?: string): boolean;
    hasPropertyMetadata(decorator: string | Function, target: any, propertyKey?: string): boolean;
    hasParamerterMetadata(decorator: string | Function, target: any, propertyKey?: string): boolean;

    getMethodMetadata<T = any>(decorator: string | Function, target: any): ObjectMap<T[]>;
    getMethodMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string): T[];

    getPropertyMetadata<T = any>(decorator: string | Function, target: any): ObjectMap<T[]>;
    getPropertyMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string): T[];

    getParamerterMetadata<T = any>(decorator: string | Function, target: any, propertyKey?: string): T[][];
    getMetadata<T = any>(decorator: string | Function, target: ClassType): T[];
    getMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'constructor'): T[][];
    getMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'method' | 'property'): ObjectMap<T[]>;
    getMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): T[];
    getMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): T[][];
    getDecorators(target: ClassType): string[];
    getDecorators(target: ClassType): string[];
    getDecorators(target: ClassType, type: DefineClassTypes): string[];
    getDecorators(target: ClassType, type: DefineClassTypes): string[];
    getDecorators(target: ClassType, type: 'parameter', propertyKey?: string): string[];

    getMetadatas<T = any>(target: ClassType): T[];
    getMetadatas<T = any>(target: any, propertyKey: string, type: 'method' | 'property'): T[];
    /**
     * get all method paramerter names.
     *
     * @export
     * @param {ClassType} target
     * @returns {ObjectMap<string[]>}
     */
    getParamerterNames(target: ClassType): ObjectMap<string[]>;
    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof LifeScope
     */
    getParamerterNames(target: ClassType<any>, propertyKey: string): string[];

    /**
     * get method paramerter providers.
     *
     * @template T
     * @param {ClassType<T>} type
     * @param {string} propertyKey
     * @returns {Provider[]}
     * @memberof TypeReflects
     */
    getParamProviders<T>(type: ClassType<T>, propertyKey: string): Provider[];

    /**
     * get type class constructor parameters.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    getParameters<T>(type: Type<T>): IParameter[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    getParameters<T>(type: Type<T>, instance: T, propertyKey: string): IParameter[];
    getParameters<T>(type: Type<T>, instance?: T, propertyKey?: string): IParameter[];

}
