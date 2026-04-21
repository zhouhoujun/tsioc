import 'reflect-metadata';
import { AnnotationMetadata, ParameterMetadata, PatternMetadata, PropertyMetadata } from './meta';
import { DecoratorOption } from './define';
import { Token } from '../tokens';
import { AbstractType } from '../types';
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
export declare function createDecorator<T>(name: string, option: DecoratorOption<T>): any;
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
export declare function createParamDecorator<T = ParameterMetadata>(name: string, options?: DecoratorOption<T>): any;
/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
export declare function createPropDecorator<T = PropertyMetadata>(name: string, options?: DecoratorOption<T>): any;
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
export declare const Abstract: IAbstractDecorator;
