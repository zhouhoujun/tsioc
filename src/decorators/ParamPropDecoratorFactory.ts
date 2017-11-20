import 'reflect-metadata';
import { Type } from '../Type';
import { ParamPropMetadata } from '../metadatas';
import { createDecorator, MetadataAdapter } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass, TypeMetadata } from '../index';
import { magenta } from 'chalk';



export type PropParamDecorator = (target: Object, propertyKey: string | symbol, parameterIndex?: number) => void;
/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator<T extends ParamPropMetadata> {
    (metadata?: Type<any> | string | T, alias?: string): PropParamDecorator;
    // (target: object, propertyKey: string | symbol): void;
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}

/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]
 * @returns {IParamPropDecorator<T>}
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(name: string, adapter?: MetadataAdapter): IParamPropDecorator<T> {
    let decorator = createDecorator<T>(name, adapter);
    decorator.decoratorType = DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}


