import { IMetadataAccess } from './MetadataAccess';
import { ClassType, Token, ObjectMap, Type } from '../types';
import { ITypeReflect } from './ITypeReflect';
import { DefineClassTypes } from '../factories';
import { ParamProviders } from '../providers';
import { IParameter } from '../IParameter';
import { InjectToken } from '../InjectToken';

/**
 * type reflects token.
 */
export const TypeReflectsToken = new InjectToken<ITypeReflects>('TypeReflects');

/**
 *  type reflects interface.
 */
export interface ITypeReflects extends IMetadataAccess {
    /**
     * has register reflect or not.
     * @param type the type
     */
    has(type: ClassType): boolean;
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
     * @returns {ParamProviders[]}
     * @memberof TypeReflects
     */
    getParamProviders<T>(type: ClassType<T>, propertyKey: string): ParamProviders[];

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
