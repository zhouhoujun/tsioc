import 'reflect-metadata';
import { Type } from '../Type';
import { ParamPropMetadata } from '../metadatas';
import { createDecorator } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator<T extends ParamPropMetadata> {
    (metadata?: T): (target: Object, propertyKey: string | symbol, parameterIndex?: number) => void;
    // (target: object, propertyKey: string | symbol): void;
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}
/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @returns
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(name: string): IParamPropDecorator<T> {
    let decorator = createDecorator<T>(name);
    decorator.decoratorType = DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}


